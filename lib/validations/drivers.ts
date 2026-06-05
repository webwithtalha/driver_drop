import { z } from "zod"

import { parsePostcodesInput, phoneNumberSchema } from "@/lib/validations/phone"

const driverFields = {
  name: z.string().trim().min(1, "Name is required"),
  phoneNumber: phoneNumberSchema,
  area: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional(),
  preferredPostcodes: z
    .union([z.array(z.string()), z.string()])
    .transform((value) => {
      if (Array.isArray(value)) {
        return value.map((part) => part.trim().toUpperCase()).filter(Boolean)
      }
      return parsePostcodesInput(value)
    })
    .optional()
    .default([]),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional(),
  isActive: z.boolean().optional().default(true),
}

export const createDriverSchema = z.object(driverFields)

export const updateDriverSchema = z.object({
  id: z.string().min(1),
  ...driverFields,
})

export const driverIdSchema = z.object({
  id: z.string().min(1, "Driver ID is required"),
})

export const driverListFiltersSchema = z.object({
  q: z.string().trim().optional(),
  active: z.enum(["all", "active", "inactive"]).optional().default("active"),
  showArchived: z.coerce.boolean().optional().default(false),
})

export type CreateDriverInput = z.infer<typeof createDriverSchema>
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>
export type DriverListFilters = z.infer<typeof driverListFiltersSchema>
