"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import Link from "next/link"
import { Archive, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

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
import { Badge } from "@/components/ui/badge"
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
import { archiveDriver, deleteDriver, restoreDriver } from "@/lib/actions/drivers"

export type DriverRow = {
  id: string
  name: string
  phoneNumber: string
  area: string | null
  preferredPostcodes: string[]
  isActive: boolean
  notes: string | null
}

type DriverTableProps = {
  drivers: DriverRow[]
  initialQuery?: string
  initialActive?: "all" | "active" | "inactive"
  initialShowArchived?: boolean
}

export function DriverTable({
  drivers,
  initialQuery = "",
  initialActive = "active",
  initialShowArchived = false,
}: DriverTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(initialQuery)
  const [activeFilter, setActiveFilter] = useState(initialActive)
  const [showArchived, setShowArchived] = useState(initialShowArchived)
  const [deleteTarget, setDeleteTarget] = useState<DriverRow | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<DriverRow | null>(null)

  function applyFilters(next?: {
    q?: string
    active?: "all" | "active" | "inactive"
    archived?: boolean
  }) {
    const params = new URLSearchParams()
    const nextQuery = next?.q ?? query
    const nextActive = next?.active ?? activeFilter
    const nextArchived = next?.archived ?? showArchived

    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim())
    }
    if (nextActive !== "active") {
      params.set("active", nextActive)
    }
    if (nextArchived) {
      params.set("archived", "true")
    }

    const search = params.toString()
    router.push(search ? `/drivers?${search}` : "/drivers")
  }

  async function handleDelete() {
    if (!deleteTarget) return

    const result = await deleteDriver(deleteTarget.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success("Driver deleted")
    setDeleteTarget(null)
    startTransition(() => router.refresh())
  }

  async function handleArchive() {
    if (!archiveTarget) return

    const result = await archiveDriver(archiveTarget.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success("Driver archived")
    setArchiveTarget(null)
    startTransition(() => router.refresh())
  }

  async function handleRestore(driver: DriverRow) {
    const result = await restoreDriver(driver.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success("Driver restored")
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Search name, phone, area, postcodes..."
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
            value={activeFilter}
            onValueChange={(value) => {
              const next = value as "all" | "active" | "inactive"
              setActiveFilter(next)
              applyFilters({ active: next })
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
              <SelectItem value="all">All drivers</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => {
                setShowArchived(event.target.checked)
                applyFilters({ archived: event.target.checked })
              }}
              className="size-4 rounded border"
            />
            Include archived
          </label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => applyFilters()}>
            Search
          </Button>
          <Link href="/drivers/new">
            <Button>Add driver</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Postcodes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No drivers found.
                </TableCell>
              </TableRow>
            ) : (
              drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.name}</TableCell>
                  <TableCell>{driver.phoneNumber}</TableCell>
                  <TableCell>{driver.area ?? "—"}</TableCell>
                  <TableCell className="max-w-48 truncate">
                    {driver.preferredPostcodes.length > 0
                      ? driver.preferredPostcodes.join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={driver.isActive ? "default" : "secondary"}>
                      {driver.isActive ? "Active" : "Archived"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="sm" disabled={isPending}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/drivers/${driver.id}/edit`)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        {driver.isActive ? (
                          <DropdownMenuItem onClick={() => setArchiveTarget(driver)}>
                            <Archive className="size-4" />
                            Archive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleRestore(driver)}>
                            <RotateCcw className="size-4" />
                            Restore
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(driver)}
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
            <AlertDialogTitle>Delete driver?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteTarget?.name}. Assigned drops will lose
              their driver reference.
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

      <AlertDialog open={Boolean(archiveTarget)} onOpenChange={() => setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive driver?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget?.name} will be marked inactive and hidden from assignment
              lists. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
