"use client"

import { UserMenu } from "@/components/layout/user-menu"
import { Truck } from "lucide-react"

type AppShellProps = {
  user: {
    email: string
    name?: string | null
  }
  children: React.ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Truck className="size-5" />
          <div>
            <p className="text-sm font-semibold">DriverDrop</p>
            <p className="text-xs text-muted-foreground">
              Send drops on WhatsApp
            </p>
          </div>
        </div>
        <UserMenu email={user.email} name={user.name} />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
