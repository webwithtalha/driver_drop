import { NextResponse } from "next/server"

import { MessageStatus } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"

type WebhookStatus = {
  id: string
  status: string
  timestamp?: string
  recipient_id?: string
  errors?: Array<{ code?: number; title?: string; message?: string }>
}

type WebhookEntry = {
  id: string
  changes?: Array<{
    value?: {
      statuses?: WebhookStatus[]
    }
  }>
}

type WebhookPayload = {
  object?: string
  entry?: WebhookEntry[]
}

function mapWebhookStatus(status: string): MessageStatus | null {
  switch (status) {
    case "sent":
    case "delivered":
    case "read":
      return MessageStatus.SENT
    case "failed":
      return MessageStatus.FAILED
    default:
      return null
  }
}

function formatWebhookError(status: WebhookStatus): string | null {
  const error = status.errors?.[0]
  if (!error) {
    return status.status === "failed" ? "Delivery failed" : null
  }
  return error.message ?? error.title ?? "Delivery failed"
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (
    mode === "subscribe" &&
    token &&
    verifyToken &&
    token === verifyToken &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function POST(request: Request) {
  let payload: WebhookPayload

  try {
    payload = (await request.json()) as WebhookPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (payload.object !== "whatsapp_business_account") {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const statusUpdates: WebhookStatus[] = []

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        statusUpdates.push(status)
      }
    }
  }

  await Promise.all(
    statusUpdates.map(async (status) => {
      const nextStatus = mapWebhookStatus(status.status)
      if (!nextStatus || !status.id) {
        return
      }

      const errorMessage =
        nextStatus === MessageStatus.FAILED
          ? formatWebhookError(status)
          : null

      await prisma.messageLog.updateMany({
        where: { providerMessageId: status.id },
        data: {
          status: nextStatus,
          ...(errorMessage ? { errorMessage } : {}),
        },
      })
    })
  )

  return NextResponse.json({ received: true }, { status: 200 })
}
