"use server"

import { revalidatePath } from "next/cache"

import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions/result"
import { requireAuth } from "@/lib/actions/auth-guard"
import { DropStatus } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import {
  buildDriverMessage,
  buildWaLink,
  type DropForMessage,
} from "@/lib/services/wa-link"
import {
  quickSendSchema,
  type QuickSendRow,
} from "@/lib/validations/quick-send"

export type DriverSendBundle = {
  driverId: string
  driverName: string
  dropIds: string[]
  dropCount: number
  message: string
  waLink: string
}

export type PrepareSendsResult = {
  created: number
  bundles: DriverSendBundle[]
}

async function getDefaultNotes(): Promise<string | null> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "default" },
    select: { defaultNotes: true },
  })
  return settings?.defaultNotes ?? null
}

export async function prepareSends(
  rows: QuickSendRow[]
): Promise<ActionResult<PrepareSendsResult>> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = quickSendSchema.safeParse({ rows })
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input")
  }

  const driverIds = [
    ...new Set(parsed.data.rows.map((row) => row.assignedDriverId)),
  ]

  const drivers = await prisma.driver.findMany({
    where: { id: { in: driverIds }, isActive: true },
    select: { id: true, name: true, phoneNumber: true },
  })

  if (drivers.length !== driverIds.length) {
    return actionError("One or more selected drivers are not available")
  }

  const driverById = new Map(drivers.map((driver) => [driver.id, driver]))
  const defaultNotes = await getDefaultNotes()

  const createdDrops = await prisma.$transaction(
    parsed.data.rows.map((row) =>
      prisma.drop.create({
        data: {
          dropNumber: row.dropNumber,
          postcode: row.postcode,
          location: row.location ?? null,
          notes: row.notes ?? defaultNotes,
          assignedDriverId: row.assignedDriverId,
          status: DropStatus.ASSIGNED,
        },
        select: { id: true },
      })
    )
  )

  const grouped = new Map<
    string,
    { dropIds: string[]; drops: DropForMessage[] }
  >()

  parsed.data.rows.forEach((row, index) => {
    const dropId = createdDrops[index].id
    const entry = grouped.get(row.assignedDriverId) ?? {
      dropIds: [],
      drops: [],
    }
    entry.dropIds.push(dropId)
    entry.drops.push({
      dropNumber: row.dropNumber,
      postcode: row.postcode,
      description: row.notes ?? row.location ?? null,
    })
    grouped.set(row.assignedDriverId, entry)
  })

  const bundles: DriverSendBundle[] = []

  for (const [driverId, entry] of grouped) {
    const driver = driverById.get(driverId)
    if (!driver) {
      continue
    }

    const message = buildDriverMessage(driver.name, entry.drops)

    bundles.push({
      driverId,
      driverName: driver.name,
      dropIds: entry.dropIds,
      dropCount: entry.dropIds.length,
      message,
      waLink: buildWaLink(driver.phoneNumber, message),
    })
  }

  revalidatePath("/")
  return actionSuccess({ created: createdDrops.length, bundles })
}

export async function markDropsSent(
  dropIds: string[]
): Promise<ActionResult<{ updated: number }>> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  if (dropIds.length === 0) {
    return actionError("No drops to mark as sent")
  }

  const result = await prisma.drop.updateMany({
    where: { id: { in: dropIds } },
    data: { status: DropStatus.SENT },
  })

  revalidatePath("/")
  return actionSuccess({ updated: result.count })
}
