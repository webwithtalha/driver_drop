import { z } from "zod"

import { MessageStatus } from "@/lib/generated/prisma/enums"

export const sendDropSchema = z.object({
  dropId: z.string().min(1, "Drop ID is required"),
  resend: z.boolean().optional().default(false),
})

export const sendDropsSchema = z.object({
  dropIds: z.array(z.string().min(1)).min(1, "Select at least one drop"),
  resend: z.boolean().optional().default(false),
})

export const messageLogFiltersSchema = z.object({
  status: z.nativeEnum(MessageStatus).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
})

export type SendDropInput = z.infer<typeof sendDropSchema>
export type SendDropsInput = z.infer<typeof sendDropsSchema>
export type MessageLogFilters = z.infer<typeof messageLogFiltersSchema>
