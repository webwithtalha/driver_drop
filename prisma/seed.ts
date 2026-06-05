import "dotenv/config"

import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

import { getPgConnectionString } from "../lib/database-url"
import { PrismaClient } from "../lib/generated/prisma/client"

const DEFAULT_MESSAGE_TEXT =
  "Hi {{driverName}}, your Evri drop for tonight:\n\nDrop No: {{dropNumber}}\nLocation/Postcode: {{postcode}}\nNotes: {{notes}}\n\nPlease confirm once received."

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: getPgConnectionString(),
  })

  return new PrismaClient({ adapter })
}

const prisma = createPrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required for seeding."
    )
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      name: "Admin",
    },
    create: {
      email: adminEmail,
      passwordHash,
      name: "Admin",
    },
  })

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      whatsappTemplateName: "evri_drop_notification",
      defaultMessageText: DEFAULT_MESSAGE_TEXT,
    },
  })

  console.log("Seed completed: admin user and default app settings created.")
}

main()
  .catch((error) => {
    console.error("Seed failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
