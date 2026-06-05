import { parsePhoneNumberFromString } from "libphonenumber-js"
import { z } from "zod"

const DEFAULT_REGION = "GB"

export function normalizePhoneNumber(
  phone: string,
  defaultCountry: string = DEFAULT_REGION
): string | null {
  const trimmed = phone.trim()
  if (!trimmed) {
    return null
  }

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry as "GB")
  if (!parsed?.isValid()) {
    return null
  }

  return parsed.format("E.164")
}

export const phoneNumberSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((value, ctx) => {
    const normalized = normalizePhoneNumber(value)
    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid UK phone number",
      })
      return z.NEVER
    }
    return normalized
  })

export function parsePostcodesInput(value: string): string[] {
  return value
    .split(/[,;\n]+/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean)
}
