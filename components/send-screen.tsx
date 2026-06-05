"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  ClipboardPaste,
  MessageCircle,
  Plus,
  RotateCcw,
  Trash2,
  UserPlus,
} from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { createDriver } from "@/lib/actions/drivers"
import {
  markDropsSent,
  prepareSends,
  type DriverSendBundle,
} from "@/lib/actions/quick-send"
import {
  POSTCODE_OPTIONS,
  matchPostcodeOption,
} from "@/lib/constants/postcodes"
import { parseDropPaste } from "@/lib/services/drop-parser"
import type { QuickSendRow } from "@/lib/validations/quick-send"

type DriverOption = {
  id: string
  name: string
  phoneNumber: string
}

const emptyRow = (): QuickSendRow => ({
  dropNumber: "",
  postcode: "",
  location: null,
  notes: null,
  assignedDriverId: "",
})

const starterRows = (): QuickSendRow[] => [
  emptyRow(),
  emptyRow(),
  emptyRow(),
  emptyRow(),
  emptyRow(),
]

type SendScreenProps = {
  drivers: DriverOption[]
}

export function SendScreen({ drivers: initialDrivers }: SendScreenProps) {
  const router = useRouter()
  const [drivers, setDrivers] = useState(initialDrivers)
  const [rows, setRows] = useState<QuickSendRow[]>(starterRows)
  const [pasteText, setPasteText] = useState("")
  const [bulkDriverId, setBulkDriverId] = useState("")
  const [driverName, setDriverName] = useState("")
  const [driverPhone, setDriverPhone] = useState("")
  const [isAddingDriver, setIsAddingDriver] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [bundles, setBundles] = useState<DriverSendBundle[] | null>(null)
  const [sentDriverIds, setSentDriverIds] = useState<string[]>([])

  const pastePreview = useMemo(() => parseDropPaste(pasteText), [pasteText])

  useEffect(() => {
    setDrivers(initialDrivers)
  }, [initialDrivers])

  function updateRow(index: number, patch: Partial<QuickSendRow>) {
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

  function getFilledRows(nextRows: QuickSendRow[]) {
    return nextRows.filter(
      (row) =>
        row.dropNumber.trim() ||
        row.postcode.trim() ||
        row.notes?.trim() ||
        row.location?.trim() ||
        row.assignedDriverId
    )
  }

  async function handleAddDriver() {
    if (!driverName.trim() || !driverPhone.trim()) {
      toast.error("Enter driver name and phone number")
      return
    }

    setIsAddingDriver(true)
    const result = await createDriver({
      name: driverName.trim(),
      phoneNumber: driverPhone.trim(),
      preferredPostcodes: [],
      isActive: true,
    })
    setIsAddingDriver(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success("Driver added")
    setDriverName("")
    setDriverPhone("")
    router.refresh()
  }

  function handleAddPasteToTable() {
    if (pastePreview.rows.length === 0) {
      toast.error("No valid drops found in paste")
      return
    }

    const pastedRows: QuickSendRow[] = pastePreview.rows.map((row) => ({
      dropNumber: row.dropNumber,
      postcode: matchPostcodeOption(row.postcode),
      location: row.location,
      notes: row.location,
      assignedDriverId: bulkDriverId,
    }))

    setRows((current) => {
      const kept = getFilledRows(current)
      return kept.length > 0 ? [...kept, ...pastedRows] : pastedRows
    })

    setPasteText("")
    toast.success(`Added ${pastedRows.length} drop(s) to the table`)
  }

  function applyBulkDriver() {
    if (!bulkDriverId) {
      toast.error("Choose a driver first")
      return
    }

    setRows((current) =>
      current.map((row) => ({ ...row, assignedDriverId: bulkDriverId }))
    )
    toast.success("Driver applied to all rows")
  }

  async function handlePrepare() {
    const filledRows = getFilledRows(rows)

    if (filledRows.length === 0) {
      toast.error("Add at least one drop")
      return
    }

    if (drivers.length === 0) {
      toast.error("Add at least one driver first")
      return
    }

    const incomplete = filledRows.some(
      (row) =>
        !row.dropNumber.trim() || !row.postcode.trim() || !row.assignedDriverId
    )

    if (incomplete) {
      toast.error("Each row needs a drop number, postcode, and driver")
      return
    }

    setIsPreparing(true)
    const result = await prepareSends(filledRows)
    setIsPreparing(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    setBundles(result.data?.bundles ?? [])
    setSentDriverIds([])
    toast.success(
      `Ready: ${result.data?.bundles.length ?? 0} driver(s) to message`
    )
  }

  async function handleSendToDriver(bundle: DriverSendBundle) {
    window.open(bundle.waLink, "_blank", "noopener,noreferrer")
    setSentDriverIds((current) =>
      current.includes(bundle.driverId)
        ? current
        : [...current, bundle.driverId]
    )
    await markDropsSent(bundle.dropIds)
  }

  function handleStartOver() {
    setBundles(null)
    setSentDriverIds([])
    setRows(starterRows())
    setBulkDriverId("")
    router.refresh()
  }

  if (bundles) {
    const allSent = bundles.every((bundle) =>
      sentDriverIds.includes(bundle.driverId)
    )

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Send on WhatsApp</h2>
            <p className="text-sm text-muted-foreground">
              Tap each driver to open WhatsApp with the message ready, then hit
              send.
            </p>
          </div>
          <Button variant="outline" onClick={handleStartOver}>
            <RotateCcw className="size-4" />
            Start over
          </Button>
        </div>

        <div className="space-y-3">
          {bundles.map((bundle) => {
            const sent = sentDriverIds.includes(bundle.driverId)
            return (
              <div
                key={bundle.driverId}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {bundle.driverName}{" "}
                    <span className="text-muted-foreground">
                      · {bundle.dropCount} drop
                      {bundle.dropCount === 1 ? "" : "s"}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                    {bundle.message}
                  </p>
                </div>
                <Button
                  variant={sent ? "outline" : "default"}
                  onClick={() => handleSendToDriver(bundle)}
                  className="shrink-0 sm:w-44"
                >
                  {sent ? (
                    <>
                      <CheckCircle2 className="size-4" />
                      Sent · open again
                    </>
                  ) : (
                    <>
                      <MessageCircle className="size-4" />
                      Send to {bundle.driverName.split(" ")[0]}
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>

        {allSent ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-600/30 bg-green-600/5 p-4 text-sm">
            <CheckCircle2 className="size-4 text-green-600" />
            All drivers messaged. Start a new batch when ready.
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <UserPlus className="size-4 text-muted-foreground" />
          <h2 className="font-medium">Drivers</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Driver name"
            value={driverName}
            onChange={(event) => setDriverName(event.target.value)}
          />
          <Input
            placeholder="Phone (e.g. 07123 456789)"
            value={driverPhone}
            onChange={(event) => setDriverPhone(event.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddDriver}
            disabled={isAddingDriver}
            className="sm:w-36"
          >
            {isAddingDriver ? "Adding..." : "Add driver"}
          </Button>
        </div>
        {drivers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {drivers.map((driver) => (
              <span
                key={driver.id}
                className="rounded-full border bg-muted/50 px-3 py-1 text-sm"
              >
                {driver.name} · {driver.phoneNumber}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add your drivers above before sending drops.
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <ClipboardPaste className="size-4 text-muted-foreground" />
          <h2 className="font-medium">Paste drops</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          One drop per line, e.g. <code>Drop 123 - IP4 1LS</code> or{" "}
          <code>Drop 456 - IP1 2AB, Tesco Extra</code>
        </p>
        <Textarea
          rows={5}
          placeholder={"Drop 123 - IP4 1LS\nDrop 456 - IP1 2AB, Tesco Extra"}
          value={pasteText}
          onChange={(event) => setPasteText(event.target.value)}
        />
        {pastePreview.unparsedLines.length > 0 ? (
          <p className="text-sm text-destructive">
            {pastePreview.unparsedLines.length} line(s) could not be parsed
          </p>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          onClick={handleAddPasteToTable}
          disabled={pastePreview.rows.length === 0}
        >
          Add to table
        </Button>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <h2 className="font-medium">Assign all rows to</h2>
            <Select
              value={bulkDriverId || undefined}
              onValueChange={(value) => setBulkDriverId(value ?? "")}
            >
              <SelectTrigger className="w-full sm:max-w-xs">
                <SelectValue placeholder="Choose a driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={applyBulkDriver}>
            Apply to all rows
          </Button>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Drop #</TableHead>
                <TableHead className="w-36">Postcode</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-44">Driver</TableHead>
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
                    <Select
                      value={row.postcode || undefined}
                      onValueChange={(value) =>
                        updateRow(index, { postcode: value ?? "" })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Postcode" />
                      </SelectTrigger>
                      <SelectContent>
                        {POSTCODE_OPTIONS.map((postcode) => (
                          <SelectItem key={postcode} value={postcode}>
                            {postcode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Optional"
                      value={row.notes ?? row.location ?? ""}
                      onChange={(event) => {
                        const value = event.target.value || null
                        updateRow(index, { notes: value, location: value })
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.assignedDriverId || undefined}
                      onValueChange={(value) =>
                        updateRow(index, { assignedDriverId: value ?? "" })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={addRow}>
            <Plus className="size-4" />
            Add row
          </Button>
          <Button
            size="lg"
            onClick={handlePrepare}
            disabled={isPreparing}
            className="sm:min-w-52"
          >
            <MessageCircle className="size-4" />
            {isPreparing ? "Preparing..." : "Prepare WhatsApp messages"}
          </Button>
        </div>
      </section>
    </div>
  )
}
