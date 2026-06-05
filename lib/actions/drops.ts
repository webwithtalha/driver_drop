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
  assignDriverSchema,
  bulkAssignDropsSchema,
  bulkCreateDropsSchema,
  bulkTableCreateSchema,
  createDropSchema,
  dropIdSchema,
  updateDropSchema,
  type BulkAssignDropsInput,
  type BulkTableRow,
  type CreateDropInput,
  type ParsedDropRow,
  type UpdateDropInput,
} from "@/lib/validations/drops"

function revalidateDropPaths() {
  revalidatePath("/drops")
  revalidatePath("/assign-drops")
  revalidatePath("/send-drops")
  revalidatePath("/dashboard")
}

function statusForAssignment(driverId: string | null | undefined) {
  return driverId ? DropStatus.ASSIGNED : DropStatus.PENDING
}

async function getDefaultNotes(): Promise<string | null> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "default" },
    select: { defaultNotes: true },
  })
  return settings?.defaultNotes ?? null
}

export async function createDrop(
  input: CreateDropInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = createDropSchema.safeParse(input)
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input")
  }

  const { assignedDriverId, notes, ...rest } = parsed.data
  const defaultNotes = notes ?? (await getDefaultNotes())

  if (assignedDriverId) {
    const driver = await prisma.driver.findFirst({
      where: { id: assignedDriverId, isActive: true },
    })
    if (!driver) {
      return actionError("Selected driver is not available")
    }
  }

  const drop = await prisma.drop.create({
    data: {
      ...rest,
      notes: defaultNotes,
      assignedDriverId,
      status: statusForAssignment(assignedDriverId),
    },
  })

  revalidateDropPaths()
  return actionSuccess({ id: drop.id })
}

export async function updateDrop(
  input: UpdateDropInput
): Promise<ActionResult> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = updateDropSchema.safeParse(input)
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input")
  }

  const { id, assignedDriverId, status, ...rest } = parsed.data

  const existing = await prisma.drop.findUnique({ where: { id } })
  if (!existing) {
    return actionError("Drop not found")
  }

  if (assignedDriverId) {
    const driver = await prisma.driver.findFirst({
      where: { id: assignedDriverId, isActive: true },
    })
    if (!driver) {
      return actionError("Selected driver is not available")
    }
  }

  const nextStatus =
    status ??
    (assignedDriverId !== undefined
      ? statusForAssignment(assignedDriverId)
      : existing.status)

  await prisma.drop.update({
    where: { id },
    data: {
      ...rest,
      assignedDriverId,
      status: nextStatus,
    },
  })

  revalidateDropPaths()
  return actionSuccess()
}

export async function deleteDrop(id: string): Promise<ActionResult> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = dropIdSchema.safeParse({ id })
  if (!parsed.success) {
    return actionError("Invalid drop ID")
  }

  const existing = await prisma.drop.findUnique({
    where: { id: parsed.data.id },
  })
  if (!existing) {
    return actionError("Drop not found")
  }

  await prisma.drop.delete({
    where: { id: parsed.data.id },
  })

  revalidateDropPaths()
  return actionSuccess()
}

export async function assignDriver(
  dropId: string,
  driverId: string | null
): Promise<ActionResult> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = assignDriverSchema.safeParse({ dropId, driverId })
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input")
  }

  const existing = await prisma.drop.findUnique({
    where: { id: parsed.data.dropId },
  })
  if (!existing) {
    return actionError("Drop not found")
  }

  if (parsed.data.driverId) {
    const driver = await prisma.driver.findFirst({
      where: { id: parsed.data.driverId, isActive: true },
    })
    if (!driver) {
      return actionError("Selected driver is not available")
    }
  }

  await prisma.drop.update({
    where: { id: parsed.data.dropId },
    data: {
      assignedDriverId: parsed.data.driverId,
      status: statusForAssignment(parsed.data.driverId),
    },
  })

  revalidateDropPaths()
  return actionSuccess()
}

export async function bulkAssignDrops(
  input: BulkAssignDropsInput
): Promise<ActionResult<{ updated: number }>> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = bulkAssignDropsSchema.safeParse(input)
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input")
  }

  const driverIds = [
    ...new Set(
      parsed.data.assignments
        .map((item) => item.driverId)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  if (driverIds.length > 0) {
    const drivers = await prisma.driver.findMany({
      where: { id: { in: driverIds }, isActive: true },
      select: { id: true },
    })

    if (drivers.length !== driverIds.length) {
      return actionError("One or more selected drivers are not available")
    }
  }

  await prisma.$transaction(
    parsed.data.assignments.map((assignment) =>
      prisma.drop.update({
        where: { id: assignment.dropId },
        data: {
          assignedDriverId: assignment.driverId,
          status: statusForAssignment(assignment.driverId),
        },
      })
    )
  )

  revalidateDropPaths()
  return actionSuccess({ updated: parsed.data.assignments.length })
}

export async function bulkCreateDrops(
  drops: ParsedDropRow[]
): Promise<ActionResult<{ created: number }>> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = bulkCreateDropsSchema.safeParse({ drops })
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input")
  }

  const defaultNotes = await getDefaultNotes()

  const result = await prisma.drop.createMany({
    data: parsed.data.drops.map((drop) => ({
      dropNumber: drop.dropNumber,
      postcode: drop.postcode,
      location: drop.location ?? null,
      notes: defaultNotes,
      status: DropStatus.PENDING,
    })),
  })

  revalidateDropPaths()
  return actionSuccess({ created: result.count })
}

export async function bulkCreateDropsFromTable(
  rows: BulkTableRow[]
): Promise<ActionResult<{ created: number }>> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = bulkTableCreateSchema.safeParse({ rows })
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input")
  }

  const defaultNotes = await getDefaultNotes()
  const driverIds = [
    ...new Set(
      parsed.data.rows
        .map((row) => row.assignedDriverId)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  if (driverIds.length > 0) {
    const drivers = await prisma.driver.findMany({
      where: { id: { in: driverIds }, isActive: true },
      select: { id: true },
    })

    if (drivers.length !== driverIds.length) {
      return actionError("One or more selected drivers are not available")
    }
  }

  await prisma.$transaction(
    parsed.data.rows.map((row) =>
      prisma.drop.create({
        data: {
          dropNumber: row.dropNumber,
          postcode: row.postcode,
          location: row.location ?? null,
          notes: defaultNotes,
          assignedDriverId: row.assignedDriverId,
          status: statusForAssignment(row.assignedDriverId),
        },
      })
    )
  )

  revalidateDropPaths()
  return actionSuccess({ created: parsed.data.rows.length })
}
