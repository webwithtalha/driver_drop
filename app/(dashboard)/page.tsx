import { redirect } from "next/navigation"

import { SendScreen } from "@/components/send-screen"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export default async function HomePage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const drivers = await prisma.driver.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phoneNumber: true },
  })

  return <SendScreen drivers={drivers} />
}
