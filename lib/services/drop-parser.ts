import type { ParsedDropRow } from "@/lib/validations/drops"

const DROP_LINE_REGEX = /^Drop\s+(\S+)\s*[-–—]\s*(.+)$/i

export type ParseResult = {
  rows: ParsedDropRow[]
  unparsedLines: string[]
}

function splitPostcodeLocation(value: string): {
  postcode: string
  location: string | null
} {
  const trimmed = value.trim()
  const commaIndex = trimmed.indexOf(",")

  if (commaIndex === -1) {
    return { postcode: trimmed, location: null }
  }

  const postcode = trimmed.slice(0, commaIndex).trim()
  const location = trimmed.slice(commaIndex + 1).trim() || null

  return { postcode, location }
}

export function parseDropPaste(text: string): ParseResult {
  const rows: ParsedDropRow[] = []
  const unparsedLines: string[] = []
  const lines = text.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    const match = trimmed.match(DROP_LINE_REGEX)

    if (!match) {
      unparsedLines.push(trimmed)
      continue
    }

    const dropNumber = match[1].trim()
    const { postcode, location } = splitPostcodeLocation(match[2])

    if (!dropNumber || !postcode) {
      unparsedLines.push(trimmed)
      continue
    }

    rows.push({
      dropNumber,
      postcode,
      location,
    })
  }

  return { rows, unparsedLines }
}
