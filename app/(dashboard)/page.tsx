import { SendScreen } from "@/components/send-screen"
import { prisma } from "@/lib/prisma"

export default async function HomePage() {
  const drivers = await prisma.driver.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phoneNumber: true },
  })

  return <SendScreen drivers={drivers} />
}
