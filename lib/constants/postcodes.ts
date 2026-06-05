export const POSTCODE_OPTIONS = [
  "CB9 8QL",
  "CO2 8HF",
  "CO10 7II",
  "IP3 9RT",
  "IP2 0UG",
  "IP27 0PA",
  "CB8 7SU",
] as const

function normalizePostcode(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase()
}

export function matchPostcodeOption(value: string): string {
  const normalized = normalizePostcode(value)
  return (
    POSTCODE_OPTIONS.find(
      (option) => normalizePostcode(option) === normalized
    ) ?? ""
  )
}
