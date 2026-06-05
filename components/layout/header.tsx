import { MobileNav } from "@/components/layout/mobile-nav"
import { UserMenu } from "@/components/layout/user-menu"
import { Separator } from "@/components/ui/separator"

type HeaderProps = {
  user: {
    email: string
    name?: string | null
  }
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <MobileNav />
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="hidden md:block">
          <p className="text-sm font-medium">DriverDrop</p>
          <p className="text-xs text-muted-foreground">
            Evri delivery drop automation
          </p>
        </div>
        <Separator orientation="vertical" className="hidden h-6 md:block" />
        <div className="ml-auto">
          <UserMenu email={user.email} name={user.name} />
        </div>
      </div>
    </header>
  )
}
