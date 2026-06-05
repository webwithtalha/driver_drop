import { z } from "zod"

export const quickSendRowSchema = z.object({
  dropNumber: z.string().trim().min(1, "Drop number is required"),
  postcode: z.string().trim().min(1, "Postcode is required"),
  location: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional(),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional(),
  assignedDriverId: z.string().trim().min(1, "Choose a driver"),
})

export const quickSendSchema = z.object({
  rows: z.array(quickSendRowSchema).min(1, "Add at least one drop"),
})

export type QuickSendRow = z.infer<typeof quickSendRowSchema>
