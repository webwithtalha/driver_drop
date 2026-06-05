"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { bulkCreateDropsFromTable } from "@/lib/actions/drops"
import type { BulkTableRow } from "@/lib/validations/drops"

type DriverOption = {
  id: string
  name: string
}

const emptyRow = (): BulkTableRow => ({
  dropNumber: "",
  postcode: "",
  location: "",
  assignedDriverId: null,
})

type BulkTableFormProps = {
  drivers: DriverOption[]
}

export function BulkTableForm({ drivers }: BulkTableFormProps) {
  const router = useRouter()
  const [rows, setRows] = useState<BulkTableRow[]>([emptyRow(), emptyRow(), emptyRow()])
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateRow(index: number, patch: Partial<BulkTableRow>) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    )
  }

  function addRow() {
    setRows((current) => [...current, emptyRow()])
  }

  function removeRow(index: number) {
    setRows((current) =>
      current.length === 1 ? [emptyRow()] : current.filter((_, i) => i !== index)
    )
  }

  async function handleCreate() {
    const filledRows = rows.filter(
      (row) => row.dropNumber.trim() || row.postcode.trim()
    )

    if (filledRows.length === 0) {
      toast.error("Add at least one drop row")
      return
    }

    setIsSubmitting(true)
    const result = await bulkCreateDropsFromTable(filledRows)
    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(`Created ${result.data?.created ?? 0} drops`)
    router.push("/drops")
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Drop #</TableHead>
              <TableHead>Postcode</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input
                    placeholder="123"
                    value={row.dropNumber}
                    onChange={(event) =>
                      updateRow(index, { dropNumber: event.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="IP4 1LS"
                    value={row.postcode}
                    onChange={(event) =>
                      updateRow(index, { postcode: event.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Optional"
                    value={row.location ?? ""}
                    onChange={(event) =>
                      updateRow(index, { location: event.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={row.assignedDriverId ?? "none"}
                    onValueChange={(value) =>
                      updateRow(index, {
                        assignedDriverId: value === "none" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="w-full min-w-36">
                      <SelectValue placeholder="Optional" />
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
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={addRow}>
          <Plus className="size-4" />
          Add row
        </Button>
        <Button onClick={handleCreate} disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create drops"}
        </Button>
      </div>
    </div>
  )
}
