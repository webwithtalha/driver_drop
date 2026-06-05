"use server"

import { revalidatePath } from "next/cache"

import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions/result"
import { requireAuth } from "@/lib/actions/auth-guard"
import { prisma } from "@/lib/prisma"
import {
  updateSettingsSchema,
  type UpdateSettingsInput,
} from "@/lib/validations/settings"

const DEFAULT_SETTINGS_ID = "default"

export type AppSettingsData = {
  whatsappTemplateName: string
  defaultMessageText: string
  defaultNotes: string | null
  businessName: string | null
  managerName: string | null
}

function revalidateSettingsPaths() {
  revalidatePath("/settings")
  revalidatePath("/send-drops")
}

export async function getSettings(): Promise<AppSettingsData> {
  await requireAuth()

  const settings = await prisma.appSettings.upsert({
    where: { id: DEFAULT_SETTINGS_ID },
    update: {},
    create: { id: DEFAULT_SETTINGS_ID },
  })

  return {
    whatsappTemplateName: settings.whatsappTemplateName,
    defaultMessageText: settings.defaultMessageText,
    defaultNotes: settings.defaultNotes,
    businessName: settings.businessName,
    managerName: settings.managerName,
  }
}

export async function updateSettings(
  input: UpdateSettingsInput
): Promise<ActionResult> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = updateSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input")
  }

  await prisma.appSettings.upsert({
    where: { id: DEFAULT_SETTINGS_ID },
    update: parsed.data,
    create: {
      id: DEFAULT_SETTINGS_ID,
      ...parsed.data,
    },
  })

  revalidateSettingsPaths()
  return actionSuccess()
}
