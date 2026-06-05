"use client"

import Link from "next/link"
import { PanelLeftClose, PanelLeftOpen, Truck } from "lucide-react"

import { NavLinks } from "@/components/layout/nav-links"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-3",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed ? (
          <Link
            href="/send"
            className="flex items-center gap-2 font-semibold text-sidebar-foreground"
          >
            <Truck className="size-5" />
            <span>DriverDrop</span>
          </Link>
        ) : (
          <Link
            href="/send"
            className="flex items-center justify-center text-sidebar-foreground"
            title="DriverDrop"
          >
            <Truck className="size-5" />
          </Link>
        )}
        {!collapsed ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        ) : null}
      </div>

      <NavLinks collapsed={collapsed} />

      {collapsed ? (
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="mx-auto"
            onClick={onToggle}
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        </div>
      ) : null}
    </aside>
  )
}
