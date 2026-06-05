"use client"

import { MessageCircle } from "lucide-react"

import { UserMenu } from "@/components/layout/user-menu"

type AppShellProps = {
  user: {
    email: string
    name?: string | null
  }
  children: React.ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/30">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-sm">
              <MessageCircle className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">DriverDrop</p>
              <p className="text-xs text-muted-foreground">
                Send drops on WhatsApp
              </p>
            </div>
          </div>
          <UserMenu email={user.email} name={user.name} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
