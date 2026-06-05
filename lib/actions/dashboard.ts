"use server"

import { startOfDay } from "date-fns"

import { requireAuth } from "@/lib/actions/auth-guard"
import { MessageStatus } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"

export type DashboardStats = {
  totalDrivers: number
  activeDrivers: number
  dropsToday: number
  dropCounts: Record<
    "PENDING" | "ASSIGNED" | "SENT" | "FAILED",
    number
  >
  recentMessageLogs: Array<{
    id: string
    driverName: string
    dropNumber: string
    status: MessageStatus
    createdAt: Date
    errorMessage: string | null
  }>
}

const TRACKED_DROP_STATUSES: Array<
  "PENDING" | "ASSIGNED" | "SENT" | "FAILED"
> = ["PENDING", "ASSIGNED", "SENT", "FAILED"]

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAuth()

  const todayStart = startOfDay(new Date())

  const [
    totalDrivers,
    activeDrivers,
    dropsToday,
    statusGroups,
    recentMessageLogs,
  ] = await Promise.all([
    prisma.driver.count(),
    prisma.driver.count({ where: { isActive: true } }),
    prisma.drop.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.drop.groupBy({
      by: ["status"],
      where: { status: { in: TRACKED_DROP_STATUSES } },
      _count: { _all: true },
    }),
    prisma.messageLog.findMany({
      include: {
        driver: { select: { name: true } },
        drop: { select: { dropNumber: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 10,
    }),
  ])

  const dropCounts = TRACKED_DROP_STATUSES.reduce(
    (counts, status) => {
      counts[status] = 0
      return counts
    },
    {} as DashboardStats["dropCounts"]
  )

  for (const group of statusGroups) {
    if (group.status in dropCounts) {
      dropCounts[group.status as keyof DashboardStats["dropCounts"]] =
        group._count._all
    }
  }

  return {
    totalDrivers,
    activeDrivers,
    dropsToday,
    dropCounts,
    recentMessageLogs: recentMessageLogs.map((log) => ({
      id: log.id,
      driverName: log.driver.name,
      dropNumber: log.drop.dropNumber,
      status: log.status,
      createdAt: log.createdAt,
      errorMessage: log.errorMessage,
    })),
  }
}
