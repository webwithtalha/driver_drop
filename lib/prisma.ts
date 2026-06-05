import pg from "pg"

import { PrismaPg } from "@prisma/adapter-pg"

import { getPgConnectionString } from "@/lib/database-url"
import { PrismaClient } from "@/lib/generated/prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function isLocalDatabase(connectionString: string) {
  return (
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1")
  )
}

function createPrismaClient() {
  const connectionString = getPgConnectionString()

  const pool = new pg.Pool({
    connectionString,
    max: 5,
    ...(isLocalDatabase(connectionString)
      ? {}
      : { ssl: { rejectUnauthorized: false } }),
  })

  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }

  return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getPrismaClient(), property, receiver)
  },
})
