import { AlertCircle } from "lucide-react"

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return "Unknown database error"
}

function getHint(message: string): string {
  if (message.includes("DATABASE_URL is not set")) {
    return "Add DATABASE_URL in Vercel → Settings → Environment Variables, then redeploy."
  }

  if (message.includes("ENETUNREACH") || message.includes("ECONNREFUSED")) {
    return "Use the Supabase Transaction pooler URL (port 6543), not the direct connection (port 5432)."
  }

  if (
    message.includes("does not exist") ||
    message.includes("P2021") ||
    message.includes("relation")
  ) {
    return "Run migrations once: DATABASE_URL=\"your-url\" npm run db:migrate:deploy"
  }

  if (message.includes("password authentication failed")) {
    return "Check your database password in DATABASE_URL. Special characters like @ must be URL-encoded."
  }

  return "Check DATABASE_URL on Vercel uses the Supabase pooler URL with ?sslmode=require"
}

export function SetupError({ error }: { error: unknown }) {
  const message = getErrorMessage(error)
  const hint = getHint(message)

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="space-y-3">
          <div>
            <h1 className="font-semibold">Database not connected</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The app works locally but needs a production database on Vercel.
            </p>
          </div>
          <div className="rounded-lg bg-background/80 p-3 text-sm">
            <p className="font-medium text-destructive">{message}</p>
            <p className="mt-2 text-muted-foreground">{hint}</p>
          </div>
          <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
            <li>
              Supabase → Settings → Database → copy{" "}
              <strong>Transaction pooler</strong> URI (port 6543)
            </li>
            <li>Paste as DATABASE_URL in Vercel env vars</li>
            <li>Redeploy, then run migrations locally once</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
