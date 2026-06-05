import { SendScreen } from "@/components/send-screen"
import { SetupError } from "@/components/setup-error"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  try {
    const drivers = await prisma.driver.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phoneNumber: true },
    })

    return <SendScreen drivers={drivers} />
  } catch (error) {
    console.error("HomePage database error:", error)
    return <SetupError error={error} />
  }
}
