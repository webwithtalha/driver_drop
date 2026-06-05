import { Send, Settings, Users, type LucideIcon } from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { title: "Send Drops", href: "/send", icon: Send },
  { title: "Drivers", href: "/drivers", icon: Users },
  { title: "Settings", href: "/settings", icon: Settings },
]

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/send") {
    return pathname === "/send"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}
