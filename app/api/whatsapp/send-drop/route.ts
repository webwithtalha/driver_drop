import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { sendDrop } from "@/lib/actions/messages"
import { sendDropSchema } from "@/lib/validations/messages"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = sendDropSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    )
  }

  const result = await sendDrop(parsed.data)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 })
  }

  return NextResponse.json({
    success: true,
    dropNumber: result.data?.dropNumber,
    status: result.data?.status,
  })
}
