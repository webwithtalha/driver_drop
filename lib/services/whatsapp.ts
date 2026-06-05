const WHATSAPP_API_VERSION = "v21.0"

export type TemplateComponent = {
  type: "body"
  parameters: Array<{ type: "text"; text: string }>
}

export type SendTemplateMessageInput = {
  to: string
  templateName: string
  languageCode?: string
  components?: TemplateComponent[]
}

export type SendTemplateMessageResult =
  | { success: true; messageId: string }
  | { success: false; error: string }

function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!accessToken || !phoneNumberId) {
    return null
  }

  return { accessToken, phoneNumberId }
}

export function isWhatsAppConfigured(): boolean {
  return getWhatsAppConfig() !== null
}

export type WhatsAppConfigStatus = {
  accessToken: boolean
  phoneNumberId: boolean
  businessAccountId: boolean
  verifyToken: boolean
  configured: boolean
}

export function getWhatsAppConfigStatus(): WhatsAppConfigStatus {
  return {
    accessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    phoneNumberId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
    businessAccountId: Boolean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID),
    verifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    configured: isWhatsAppConfigured(),
  }
}

function formatWhatsAppRecipient(phoneNumber: string): string {
  return phoneNumber.replace(/^\+/, "")
}

export async function sendTemplateMessage(
  input: SendTemplateMessageInput
): Promise<SendTemplateMessageResult> {
  const config = getWhatsAppConfig()
  if (!config) {
    return {
      success: false,
      error: "WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
    }
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${config.phoneNumberId}/messages`

  const body = {
    messaging_product: "whatsapp",
    to: formatWhatsAppRecipient(input.to),
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.languageCode ?? "en" },
      ...(input.components?.length ? { components: input.components } : {}),
    },
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = (await response.json()) as {
      messages?: Array<{ id: string }>
      error?: { message?: string; error_user_msg?: string }
    }

    if (!response.ok) {
      const errorMessage =
        data.error?.error_user_msg ??
        data.error?.message ??
        `WhatsApp API error (${response.status})`
      return { success: false, error: errorMessage }
    }

    const messageId = data.messages?.[0]?.id
    if (!messageId) {
      return { success: false, error: "WhatsApp API returned no message ID" }
    }

    return { success: true, messageId }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach WhatsApp API"
    return { success: false, error: message }
  }
}
