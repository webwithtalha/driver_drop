import { z } from "zod"

import { DropStatus } from "@/lib/generated/prisma/enums"

const dropFields = {
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
  assignedDriverId: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional(),
}

export const createDropSchema = z.object(dropFields)

export const updateDropSchema = z.object({
  id: z.string().min(1),
  ...dropFields,
  status: z.nativeEnum(DropStatus).optional(),
})

export const dropIdSchema = z.object({
  id: z.string().min(1, "Drop ID is required"),
})

export const assignDriverSchema = z.object({
  dropId: z.string().min(1),
  driverId: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable(),
})

export const bulkAssignDropsSchema = z.object({
  assignments: z
    .array(
      z.object({
        dropId: z.string().min(1),
        driverId: z
          .string()
          .trim()
          .transform((value) => value || null)
          .nullable(),
      })
    )
    .min(1, "At least one assignment is required"),
})

export const dropListFiltersSchema = z.object({
  q: z.string().trim().optional(),
  status: z.nativeEnum(DropStatus).optional(),
})

export const bulkPasteSchema = z.object({
  text: z.string().trim().min(1, "Paste at least one drop line"),
})

export const parsedDropRowSchema = z.object({
  dropNumber: z.string().trim().min(1),
  postcode: z.string().trim().min(1),
  location: z.string().trim().nullable().optional(),
})

export const bulkCreateDropsSchema = z.object({
  drops: z.array(parsedDropRowSchema).min(1, "Add at least one drop"),
})

export const bulkTableRowSchema = z.object({
  dropNumber: z.string().trim().min(1, "Drop number is required"),
  postcode: z.string().trim().min(1, "Postcode is required"),
  location: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional(),
  assignedDriverId: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional(),
})

export const bulkTableCreateSchema = z.object({
  rows: z.array(bulkTableRowSchema).min(1, "Add at least one row"),
})

export type CreateDropInput = z.infer<typeof createDropSchema>
export type UpdateDropInput = z.infer<typeof updateDropSchema>
export type BulkAssignDropsInput = z.infer<typeof bulkAssignDropsSchema>
export type DropListFilters = z.infer<typeof dropListFiltersSchema>
export type ParsedDropRow = z.infer<typeof parsedDropRowSchema>
export type BulkTableRow = z.infer<typeof bulkTableRowSchema>
