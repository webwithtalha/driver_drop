"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { bulkAssignDrops } from "@/lib/actions/drops"

type PendingDrop = {
  id: string
  dropNumber: string
  postcode: string
  location: string | null
  assignedDriverId: string | null
}

type DriverOption = {
  id: string
  name: string
  area: string | null
  preferredPostcodes: string[]
}

type AssignDropsTableProps = {
  drops: PendingDrop[]
  drivers: DriverOption[]
}

export function AssignDropsTable({ drops, drivers }: AssignDropsTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [assignments, setAssignments] = useState<Record<string, string | null>>(
    () =>
      Object.fromEntries(
        drops.map((drop) => [drop.id, drop.assignedDriverId])
      )
  )
  const [selectedDropIds, setSelectedDropIds] = useState<string[]>([])
  const [bulkDriverId, setBulkDriverId] = useState<string>("")
  const [driverQuery, setDriverQuery] = useState("")
  const [areaFilter, setAreaFilter] = useState("")
  const [postcodeFilter, setPostcodeFilter] = useState("")

  const filteredDrivers = useMemo(() => {
    const query = driverQuery.trim().toLowerCase()
    const area = areaFilter.trim().toLowerCase()
    const postcode = postcodeFilter.trim().toUpperCase()

    return drivers.filter((driver) => {
      const matchesQuery =
        !query ||
        driver.name.toLowerCase().includes(query) ||
        (driver.area?.toLowerCase().includes(query) ?? false) ||
        driver.preferredPostcodes.some((code) =>
          code.toLowerCase().includes(query)
        )

      const matchesArea =
        !area || (driver.area?.toLowerCase().includes(area) ?? false)

      const matchesPostcode =
        !postcode ||
        driver.preferredPostcodes.some((code) => code.includes(postcode))

      return matchesQuery && matchesArea && matchesPostcode
    })
  }, [drivers, driverQuery, areaFilter, postcodeFilter])

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

  function setDriverForDrop(dropId: string, driverId: string | null) {
    setAssignments((current) => ({ ...current, [dropId]: driverId }))
  }

  function applyBulkDriver() {
    if (!bulkDriverId || selectedDropIds.length === 0) {
      toast.error("Select drops and a driver first")
      return
    }

    setAssignments((current) => {
      const next = { ...current }
      for (const dropId of selectedDropIds) {
        next[dropId] = bulkDriverId
      }
      return next
    })
    toast.success(`Assigned ${selectedDropIds.length} drop(s)`)
  }

  async function handleSave() {
    const payload = drops.map((drop) => ({
      dropId: drop.id,
      driverId: assignments[drop.id] ?? null,
    }))

    const result = await bulkAssignDrops({ assignments: payload })
    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(`Updated ${result.data?.updated ?? 0} assignment(s)`)
    startTransition(() => router.refresh())
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      <aside className="space-y-4 rounded-lg border p-4">
        <div>
          <h2 className="font-medium">Filter drivers</h2>
          <p className="text-sm text-muted-foreground">
            Narrow the list when choosing assignments.
          </p>
        </div>
        <Input
          placeholder="Search name or postcodes"
          value={driverQuery}
          onChange={(event) => setDriverQuery(event.target.value)}
        />
        <Input
          placeholder="Filter by area"
          value={areaFilter}
          onChange={(event) => setAreaFilter(event.target.value)}
        />
        <Input
          placeholder="Filter by postcode"
          value={postcodeFilter}
          onChange={(event) => setPostcodeFilter(event.target.value)}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Matching drivers ({filteredDrivers.length})
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto text-sm">
            {filteredDrivers.length === 0 ? (
              <p className="text-muted-foreground">No drivers match.</p>
            ) : (
              filteredDrivers.map((driver) => (
                <div key={driver.id} className="rounded-md border p-2">
                  <p className="font-medium">{driver.name}</p>
                  {driver.area ? (
                    <p className="text-muted-foreground">{driver.area}</p>
                  ) : null}
                  {driver.preferredPostcodes.length > 0 ? (
                    <p className="text-muted-foreground">
                      {driver.preferredPostcodes.join(", ")}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">Bulk assign selected to</p>
            <Select
              value={bulkDriverId}
              onValueChange={(value) => setBulkDriverId(value ?? "")}
            >
              <SelectTrigger className="w-full sm:max-w-xs">
                <SelectValue placeholder="Choose driver" />
              </SelectTrigger>
              <SelectContent>
                {filteredDrivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={applyBulkDriver}
            disabled={!bulkDriverId || selectedDropIds.length === 0}
          >
            Assign selected
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save assignments"}
          </Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {drops.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No pending drops to assign.
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
                    <TableCell>
                      <Select
                        value={assignments[drop.id] ?? "none"}
                        onValueChange={(value) =>
                          setDriverForDrop(
                            drop.id,
                            value === "none" ? null : value
                          )
                        }
                      >
                        <SelectTrigger className="w-full min-w-40">
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {drivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
