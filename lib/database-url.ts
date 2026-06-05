function decodePrismaPostgresUrl(url: string): string {
  const parsed = new URL(url)
  const apiKey = parsed.searchParams.get("api_key")

  if (!apiKey) {
    throw new Error("Invalid prisma+postgres DATABASE_URL: missing api_key")
  }

  const payload = JSON.parse(
    Buffer.from(apiKey, "base64").toString("utf8")
  ) as { databaseUrl?: string }

  if (!payload.databaseUrl) {
    throw new Error("Invalid prisma+postgres DATABASE_URL: missing databaseUrl")
  }

  return payload.databaseUrl
}

export function getPgConnectionString(
  url = process.env.DATABASE_URL
): string {
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }

  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return url
  }

  if (url.startsWith("prisma+postgres://")) {
    return decodePrismaPostgresUrl(url)
  }

  throw new Error(`Unsupported DATABASE_URL protocol: ${url.split(":")[0]}`)
}
