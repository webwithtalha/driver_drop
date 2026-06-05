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
  createDriverSchema,
  driverIdSchema,
  updateDriverSchema,
  type CreateDriverInput,
  type UpdateDriverInput,
} from "@/lib/validations/drivers"

function revalidateDriverPaths() {
  revalidatePath("/")
}

export async function createDriver(
  input: CreateDriverInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = createDriverSchema.safeParse(input)
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input")
  }

  const driver = await prisma.driver.create({
    data: parsed.data,
  })

  revalidateDriverPaths()
  return actionSuccess({ id: driver.id })
}

export async function updateDriver(
  input: UpdateDriverInput
): Promise<ActionResult> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = updateDriverSchema.safeParse(input)
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input")
  }

  const { id, ...data } = parsed.data

  const existing = await prisma.driver.findUnique({ where: { id } })
  if (!existing) {
    return actionError("Driver not found")
  }

  await prisma.driver.update({
    where: { id },
    data,
  })

  revalidateDriverPaths()
  return actionSuccess()
}

export async function archiveDriver(id: string): Promise<ActionResult> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = driverIdSchema.safeParse({ id })
  if (!parsed.success) {
    return actionError("Invalid driver ID")
  }

  const existing = await prisma.driver.findUnique({
    where: { id: parsed.data.id },
  })
  if (!existing) {
    return actionError("Driver not found")
  }

  await prisma.driver.update({
    where: { id: parsed.data.id },
    data: { isActive: false },
  })

  revalidateDriverPaths()
  return actionSuccess()
}

export async function restoreDriver(id: string): Promise<ActionResult> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = driverIdSchema.safeParse({ id })
  if (!parsed.success) {
    return actionError("Invalid driver ID")
  }

  const existing = await prisma.driver.findUnique({
    where: { id: parsed.data.id },
  })
  if (!existing) {
    return actionError("Driver not found")
  }

  await prisma.driver.update({
    where: { id: parsed.data.id },
    data: { isActive: true },
  })

  revalidateDriverPaths()
  return actionSuccess()
}

export async function deleteDriver(id: string): Promise<ActionResult> {
  try {
    await requireAuth()
  } catch {
    return actionError("Unauthorized")
  }

  const parsed = driverIdSchema.safeParse({ id })
  if (!parsed.success) {
    return actionError("Invalid driver ID")
  }

  const existing = await prisma.driver.findUnique({
    where: { id: parsed.data.id },
    include: { drops: { take: 1 } },
  })

  if (!existing) {
    return actionError("Driver not found")
  }

  await prisma.driver.delete({
    where: { id: parsed.data.id },
  })

  revalidateDriverPaths()
  revalidatePath("/drops")
  return actionSuccess()
}

export async function getActiveDrivers() {
  await requireAuth()

  return prisma.driver.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      area: true,
      preferredPostcodes: true,
      phoneNumber: true,
    },
  })
}
