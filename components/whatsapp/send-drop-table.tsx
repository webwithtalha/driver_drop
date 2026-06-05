"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { DropStatusBadge } from "@/components/drops/drop-status-badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DropStatus } from "@/lib/generated/prisma/enums"
import { sendDrops } from "@/lib/actions/messages"

export type SendDropRow = {
  id: string
  dropNumber: string
  postcode: string
  location: string | null
  status: DropStatus
  assignedDriver: {
    id: string
    name: string
    phoneNumber: string
  } | null
}

type SendDropTableProps = {
  drops: SendDropRow[]
  resendEnabled: boolean
}

export function SendDropTable({ drops, resendEnabled }: SendDropTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedDropIds, setSelectedDropIds] = useState<string[]>([])

  const allSelected =
    drops.length > 0 && selectedDropIds.length === drops.length

  function toggleSelectAll(checked: boolean) {
    setSelectedDropIds(checked ? drops.map((drop) => drop.id) : [])
  }

  function toggleDrop(dropId: string, checked: boolean) {
    setSelectedDropIds((current) =>
      checked
        ? [...new Set([...current, dropId])]
        : current.filter((id) => id !== dropId)
    )
  }

  async function handleSend(dropIds: string[]) {
    if (dropIds.length === 0) {
      toast.error("Select at least one drop")
      return
    }

    const result = await sendDrops({ dropIds, resend: resendEnabled })
    if (!result.success) {
      toast.error(result.error)
      return
    }

    const { sent, failed, skipped } = result.data ?? {
      sent: 0,
      failed: 0,
      skipped: 0,
    }

    const parts = [`${sent} sent`]
    if (failed > 0) parts.push(`${failed} failed`)
    if (skipped > 0) parts.push(`${skipped} skipped`)

    if (failed > 0) {
      toast.error(parts.join(", "))
    } else {
      toast.success(parts.join(", "))
    }

    setSelectedDropIds([])
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {drops.length} drop(s) ready to send
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={isPending || selectedDropIds.length === 0}
            onClick={() => handleSend(selectedDropIds)}
          >
            {isPending ? "Sending..." : "Send selected"}
          </Button>
          <Button
            disabled={isPending || drops.length === 0}
            onClick={() => handleSend(drops.map((drop) => drop.id))}
          >
            {isPending ? "Sending..." : "Send all"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                />
              </TableHead>
              <TableHead>Drop #</TableHead>
              <TableHead>Postcode</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drops.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  {resendEnabled
                    ? "No assigned, sent, or failed drops to send."
                    : "No assigned drops ready to send."}
                </TableCell>
              </TableRow>
            ) : (
              drops.map((drop) => (
                <TableRow key={drop.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedDropIds.includes(drop.id)}
                      onCheckedChange={(checked) =>
                        toggleDrop(drop.id, Boolean(checked))
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{drop.dropNumber}</TableCell>
                  <TableCell>{drop.postcode}</TableCell>
                  <TableCell>{drop.location ?? "—"}</TableCell>
                  <TableCell>{drop.assignedDriver?.name ?? "—"}</TableCell>
                  <TableCell>{drop.assignedDriver?.phoneNumber ?? "—"}</TableCell>
                  <TableCell>
                    <DropStatusBadge status={drop.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function ResendToggle({
  enabled,
}: {
  enabled: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function toggleResend(checked: boolean) {
    const params = new URLSearchParams()
    if (checked) {
      params.set("resend", "1")
    }
    const search = params.toString()
    startTransition(() => {
      router.push(search ? `/send-drops?${search}` : "/send-drops")
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="resend-toggle"
        checked={enabled}
        disabled={isPending}
        onCheckedChange={(checked) => toggleResend(Boolean(checked))}
      />
      <Label htmlFor="resend-toggle" className="text-sm font-normal">
        Include sent and failed drops (resend)
      </Label>
    </div>
  )
}
