"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, Truck } from "lucide-react"

import { NavLinks } from "@/components/layout/nav-links"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="md:hidden" />
        }
      >
        <Menu className="size-4" />
        <span className="sr-only">Open navigation menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Truck className="size-5" />
            DriverDrop
          </SheetTitle>
        </SheetHeader>
        <NavLinks onNavigate={() => setOpen(false)} />
        <div className="mt-auto border-t border-border p-4">
          <Link
            href="/send"
            className="text-sm text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            Back to send drops
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
