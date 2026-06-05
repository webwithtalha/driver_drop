"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { isNavItemActive, navItems } from "@/components/layout/nav-config"

type NavLinksProps = {
  collapsed?: boolean
  onNavigate?: () => void
}

export function NavLinks({ collapsed = false, onNavigate }: NavLinksProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
      {navItems.map((item) => {
        const active = isNavItemActive(pathname, item.href)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.title : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed ? <span className="truncate">{item.title}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}
