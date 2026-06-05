import { z } from "zod"

export const updateSettingsSchema = z.object({
  whatsappTemplateName: z
    .string()
    .trim()
    .min(1, "Template name is required"),
  defaultMessageText: z
    .string()
    .trim()
    .min(1, "Default message text is required"),
  defaultNotes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional(),
  businessName: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional(),
  managerName: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional(),
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
