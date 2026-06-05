function normalizeDatabaseUrl(url: string): string {
  return url.trim().replace(/^['"]|['"]$/g, "")
}

function decodePrismaPostgresUrl(url: string): string {
  const parsed = new URL(url)
  const apiKey = parsed.searchParams.get("api_key")

  if (!apiKey) {
    throw new Error("Invalid prisma+postgres DATABASE_URL: missing api_key")
  }

  try {
    const payload = JSON.parse(
      Buffer.from(apiKey, "base64").toString("utf8")
    ) as { databaseUrl?: string }

    if (!payload.databaseUrl) {
      throw new Error("Invalid prisma+postgres DATABASE_URL: missing databaseUrl")
    }

    return payload.databaseUrl
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        "Invalid prisma+postgres DATABASE_URL: api_key is not valid base64 JSON. For production, use a direct postgresql:// connection string."
      )
    }

    throw error
  }
}

export function getPgConnectionString(
  url = process.env.DATABASE_URL
): string {
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }

  const normalized = normalizeDatabaseUrl(url)

  if (
    normalized.startsWith("postgres://") ||
    normalized.startsWith("postgresql://")
  ) {
    return normalized
  }

  if (normalized.startsWith("prisma+postgres://")) {
    return decodePrismaPostgresUrl(normalized)
  }

  throw new Error(
    `Unsupported DATABASE_URL protocol: ${normalized.split(":")[0]}. Use postgresql:// for production.`
  )
}
