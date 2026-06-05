"use server"

import { revalidatePath } from "next/cache"

import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions/result"
import { requireAuth } from "@/lib/actions/auth-guard"
import { DropStatus, MessageStatus } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import {
  formatPostcodeWithLocation,
  interpolateMessageTemplate,
} from "@/lib/services/message-template"
import { sendTemplateMessage } from "@/lib/services/whatsapp"
import {
  sendDropSchema,
  sendDropsSchema,
  type SendDropInput,
  type SendDropsInput,
} from "@/lib/validations/messages"

export type SendDropError = {
  dropId: string
  dropNumber: string
  error: string
}

export type SendDropsResult = {
  sent: number
  failed: number
  skipped: number
  errors: SendDropError[]
}

function revalidateMessagePaths() {
  revalidatePath("/send-drops")
  revalidatePath("/message-logs")
  revalidatePath("/drops")
  revalidatePath("/dashboard")
}

async function getAppSettings() {
  return prisma.appSettings.findUnique({
    where: { id: "default" },
  })
}

export async function sendSingleDrop(
  dropId: string,
  resend: boolean
): Promise<
  | { outcome: "sent"; dropNumber: string }
  | { outcome: "failed"; dropNumber: string; error: string }
  | { outcome: "skipped"; dropNumber: string; error: string }
> {
  const drop = await prisma.drop.findUnique({
    where: { id: dropId },
    include: {
      assignedDriver: true,
    },
  })

  if (!drop) {
    return { outcome: "skipped", dropNumber: dropId, error: "Drop not found" }
  }

  if (!drop.assignedDriverId || !drop.assignedDriver) {
    return {
      outcome: "skipped",
      dropNumber: drop.dropNumber,
      error: "Drop has no assigned driver",
    }
  }

  if (!drop.assignedDriver.isActive) {
    return {
      outcome: "skipped",
      dropNumber: drop.dropNumber,
      error: "Assigned driver is inactive",
    }
  }

  const sendableWithResend = [
    DropStatus.ASSIGNED,
    DropStatus.SENT,
    DropStatus.FAILED,
  ] as const

  if (resend) {
    if (!sendableWithResend.includes(drop.status as (typeof sendableWithResend)[number])) {
      return {
        outcome: "skipped",
        dropNumber: drop.dropNumber,
        error: `Drop status is ${drop.status}`,
      }
    }
  } else if (drop.status !== DropStatus.ASSIGNED) {
    return {
      outcome: "skipped",
      dropNumber: drop.dropNumber,
      error:
        drop.status === DropStatus.SENT
          ? "Already sent (enable resend to send again)"
          : `Drop status is ${drop.status}`,
    }
  }

  const settings = await getAppSettings()
  const templateName =
    settings?.whatsappTemplateName ?? "evri_drop_notification"
  const defaultMessageText =
    settings?.defaultMessageText ??
    "Hi {{driverName}}, your Evri drop for tonight:\n\nDrop No: {{dropNumber}}\nLocation/Postcode: {{postcode}}\nNotes: {{notes}}\n\nPlease confirm once received."

  const postcodeDisplay = formatPostcodeWithLocation(
    drop.postcode,
    drop.location
  )
  const notes = drop.notes ?? settings?.defaultNotes ?? "—"

  const messageBody = interpolateMessageTemplate(defaultMessageText, {
    driverName: drop.assignedDriver.name,
    dropNumber: drop.dropNumber,
    postcode: postcodeDisplay,
    notes,
  })

  const templateComponents = {
    type: "body" as const,
    parameters: [
      { type: "text" as const, text: drop.assignedDriver.name },
      { type: "text" as const, text: drop.dropNumber },
      { type: "text" as const, text: postcodeDisplay },
      { type: "text" as const, text: notes },
    ],
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const messageLog = await tx.messageLog.create({
        data: {
          dropId: drop.id,
          driverId: drop.assignedDriver!.id,
          phoneNumber: drop.assignedDriver!.phoneNumber,
          messageBody,
          status: MessageStatus.QUEUED,
        },
      })

      const whatsappResult = await sendTemplateMessage({
        to: drop.assignedDriver!.phoneNumber,
        templateName,
        components: [templateComponents],
      })

      if (whatsappResult.success) {
        await tx.messageLog.update({
          where: { id: messageLog.id },
          data: {
            status: MessageStatus.SENT,
            providerMessageId: whatsappResult.messageId,
          },
        })
        await tx.drop.update({
          where: { id: drop.id },
          data: { status: DropStatus.SENT },
        })
        return { success: true as const, messageId: whatsappResult.messageId }
      }

      await tx.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: MessageStatus.FAILED,
          errorMessage: whatsappResult.error,
        },
      })
      await tx.drop.update({
        where: { id: drop.id },
        data: { status: DropStatus.FAILED },
      })
      return { success: false as const, error: whatsappResult.error }
    })

    if (result.success) {
      return { outcome: "sent", dropNumber: drop.dropNumber }
    }

    return {
      outcome: "failed",
      dropNumber: drop.dropNumber,
      error: result.error,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected send error"
    return {
      outcome: "failed",
      dropNumber: drop.dropNumber,
      error: message,
    }
  }
}

export async function sendDrops(
  input: SendDropsInput
): Promise<ActionResult<SendDropsResult>> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = sendDropsSchema.safeParse(input)
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input")
  }

  const result: SendDropsResult = {
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  }

  for (const dropId of parsed.data.dropIds) {
    const outcome = await sendSingleDrop(dropId, parsed.data.resend)

    if (outcome.outcome === "sent") {
      result.sent += 1
    } else if (outcome.outcome === "failed") {
      result.failed += 1
      result.errors.push({
        dropId,
        dropNumber: outcome.dropNumber,
        error: outcome.error,
      })
    } else {
      result.skipped += 1
      result.errors.push({
        dropId,
        dropNumber: outcome.dropNumber,
        error: outcome.error,
      })
    }
  }

  revalidateMessagePaths()
  return actionSuccess(result)
}

export async function sendDrop(
  input: SendDropInput
): Promise<
  ActionResult<{ dropNumber: string; status: "sent" | "failed" | "skipped" }>
> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = sendDropSchema.safeParse(input)
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input")
  }

  const outcome = await sendSingleDrop(parsed.data.dropId, parsed.data.resend)

  revalidateMessagePaths()

  if (outcome.outcome === "sent") {
    return actionSuccess({ dropNumber: outcome.dropNumber, status: "sent" })
  }

  if (outcome.outcome === "failed") {
    return actionError(outcome.error)
  }

  return actionError(outcome.error)
}
