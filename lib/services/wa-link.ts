export type DropForMessage = {
  dropNumber: string
  postcode: string
  description?: string | null
}

export function toWaDigits(phone: string): string {
  return phone.replace(/\D/g, "")
}

export function buildDriverMessage(
  driverName: string,
  drops: DropForMessage[]
): string {
  const lines = drops.map((drop) => {
    const description = drop.description?.trim()
    const suffix = description ? ` (${description})` : ""
    return `• Drop ${drop.dropNumber} — ${drop.postcode}${suffix}`
  })

  return [
    `Hi ${driverName}, here are your drops:`,
    "",
    lines.join("\n"),
    "",
    "Please confirm once received.",
  ].join("\n")
}

export function buildWaLink(phone: string, message: string): string {
  return `https://wa.me/${toWaDigits(phone)}?text=${encodeURIComponent(message)}`
}
