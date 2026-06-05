"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { DropStatusBadge } from "@/components/drops/drop-status-badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DropStatus } from "@/lib/generated/prisma/enums"
import { deleteDrop } from "@/lib/actions/drops"

export type DropRow = {
  id: string
  dropNumber: string
  postcode: string
  location: string | null
  status: DropStatus
  assignedDriver: { id: string; name: string } | null
}

type DropTableProps = {
  drops: DropRow[]
  initialQuery?: string
  initialStatus?: DropStatus | "all"
}

const statusOptions: Array<{ value: DropStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: DropStatus.PENDING, label: "Pending" },
  { value: DropStatus.ASSIGNED, label: "Assigned" },
  { value: DropStatus.SENT, label: "Sent" },
  { value: DropStatus.FAILED, label: "Failed" },
  { value: DropStatus.CANCELLED, label: "Cancelled" },
  { value: DropStatus.COMPLETED, label: "Completed" },
]

export function DropTable({
  drops,
  initialQuery = "",
  initialStatus = "all",
}: DropTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(initialQuery)
  const [statusFilter, setStatusFilter] = useState<DropStatus | "all">(
    initialStatus
  )
  const [deleteTarget, setDeleteTarget] = useState<DropRow | null>(null)

  function applyFilters(next?: { q?: string; status?: DropStatus | "all" }) {
    const params = new URLSearchParams()
    const nextQuery = next?.q ?? query
    const nextStatus = next?.status ?? statusFilter

    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim())
    }
    if (nextStatus !== "all") {
      params.set("status", nextStatus)
    }

    const search = params.toString()
    router.push(search ? `/drops?${search}` : "/drops")
  }

  async function handleDelete() {
    if (!deleteTarget) return

    const result = await deleteDrop(deleteTarget.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success("Drop deleted")
    setDeleteTarget(null)
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Search drop number or postcode..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applyFilters()
              }
            }}
            className="max-w-md"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              const next = value as DropStatus | "all"
              setStatusFilter(next)
              applyFilters({ status: next })
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => applyFilters()}>
            Search
          </Button>
          <Link href="/drops/bulk">
            <Button variant="outline">Bulk add</Button>
          </Link>
          <Link href="/drops/new">
            <Button>Add drop</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Drop #</TableHead>
              <TableHead>Postcode</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {drops.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No drops found.
                </TableCell>
              </TableRow>
            ) : (
              drops.map((drop) => (
                <TableRow key={drop.id}>
                  <TableCell className="font-medium">{drop.dropNumber}</TableCell>
                  <TableCell>{drop.postcode}</TableCell>
                  <TableCell>{drop.location ?? "—"}</TableCell>
                  <TableCell>{drop.assignedDriver?.name ?? "—"}</TableCell>
                  <TableCell>
                    <DropStatusBadge status={drop.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="sm" disabled={isPending} />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/drops/${drop.id}/edit`)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(drop)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete drop?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes drop {deleteTarget?.dropNumber} (
              {deleteTarget?.postcode}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
