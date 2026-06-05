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
  Users,
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
import { cn } from "@/lib/utils"
import type { QuickSendRow } from "@/lib/validations/quick-send"

type DriverOption = {
  id: string
  name: string
  phoneNumber: string
}

const WA_GREEN =
  "bg-[#25D366] text-white hover:bg-[#1faa55] focus-visible:ring-[#25D366]/40"

const emptyRow = (): QuickSendRow => ({
  dropNumber: "",
  postcode: "",
  location: null,
  notes: null,
  assignedDriverId: "",
})

const starterRows = (): QuickSendRow[] => [emptyRow(), emptyRow(), emptyRow()]

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function SectionCard({
  step,
  icon,
  title,
  subtitle,
  children,
}: {
  step: number
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {step}
        </span>
      </div>
      {children}
    </section>
  )
}

type SendScreenProps = {
  drivers: DriverOption[]
}

export function SendScreen({ drivers: initialDrivers }: SendScreenProps) {
  const router = useRouter()
  const [drivers, setDrivers] = useState(initialDrivers)
  const [rows, setRows] = useState<QuickSendRow[]>(starterRows)
  const [pasteText, setPasteText] = useState("")
  const [showPaste, setShowPaste] = useState(false)
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
    setShowPaste(false)
    toast.success(`Added ${pastedRows.length} drop(s)`)
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
      toast.error("Each drop needs a number, postcode, and driver")
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

  const filledCount = getFilledRows(rows).length

  if (bundles) {
    const sentCount = bundles.filter((bundle) =>
      sentDriverIds.includes(bundle.driverId)
    ).length
    const allSent = sentCount === bundles.length

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              Send on WhatsApp
            </h1>
            <p className="text-sm text-muted-foreground">
              Tap a driver to open WhatsApp with the message ready.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleStartOver}>
            <RotateCcw className="size-4" />
            <span className="hidden sm:inline">Start over</span>
          </Button>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 text-sm shadow-sm">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[#25D366] transition-all"
              style={{
                width: `${(sentCount / bundles.length) * 100}%`,
              }}
            />
          </div>
          <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
            {sentCount}/{bundles.length} sent
          </span>
        </div>

        <div className="space-y-3">
          {bundles.map((bundle) => {
            const sent = sentDriverIds.includes(bundle.driverId)
            return (
              <div
                key={bundle.driverId}
                className={cn(
                  "rounded-2xl border bg-card p-4 shadow-sm transition-colors",
                  sent ? "border-[#25D366]/40" : "border-border/70"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {initials(bundle.driverName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{bundle.driverName}</p>
                    <p className="text-xs text-muted-foreground">
                      {bundle.dropCount} drop
                      {bundle.dropCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  {sent ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-[#1faa55]">
                      <CheckCircle2 className="size-4" />
                      Sent
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 whitespace-pre-line rounded-2xl rounded-tl-sm bg-muted/70 p-3 text-sm text-foreground/90">
                  {bundle.message}
                </div>

                <Button
                  onClick={() => handleSendToDriver(bundle)}
                  className={cn("mt-3 w-full", !sent && WA_GREEN)}
                  variant={sent ? "outline" : "default"}
                >
                  <MessageCircle className="size-4" />
                  {sent ? "Open again" : `Send to ${bundle.driverName.split(" ")[0]}`}
                </Button>
              </div>
            )
          })}
        </div>

        {allSent ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 p-4 text-sm font-medium">
            <CheckCircle2 className="size-4 text-[#1faa55]" />
            All drivers messaged. Start a new batch when ready.
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
          New drops
        </h1>
        <p className="text-sm text-muted-foreground">
          Add drops, pick a driver, and send them on WhatsApp.
        </p>
      </div>

      <SectionCard
        step={1}
        icon={<Users className="size-5" />}
        title="Drivers"
        subtitle="Saved drivers you can assign drops to"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Driver name"
            value={driverName}
            onChange={(event) => setDriverName(event.target.value)}
          />
          <Input
            placeholder="Phone e.g. 07123 456789"
            value={driverPhone}
            inputMode="tel"
            onChange={(event) => setDriverPhone(event.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddDriver}
            disabled={isAddingDriver}
            className="sm:w-32"
          >
            <Plus className="size-4" />
            {isAddingDriver ? "Adding" : "Add"}
          </Button>
        </div>
        {drivers.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {drivers.map((driver) => (
              <span
                key={driver.id}
                className="flex items-center gap-2 rounded-full border bg-background px-2.5 py-1 text-xs"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                  {initials(driver.name)}
                </span>
                <span className="font-medium">{driver.name}</span>
                <span className="text-muted-foreground">
                  {driver.phoneNumber}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Add at least one driver to start sending.
          </p>
        )}
      </SectionCard>

      <SectionCard
        step={2}
        icon={<ClipboardPaste className="size-5" />}
        title="Drops"
        subtitle="Enter manually or paste a list"
      >
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Select
            value={bulkDriverId || undefined}
            onValueChange={(value) => setBulkDriverId(value ?? "")}
          >
            <SelectTrigger className="w-full sm:max-w-[14rem]">
              <SelectValue placeholder="Assign all rows to…" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyBulkDriver}
              className="flex-1 sm:flex-none"
            >
              Apply to all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPaste((value) => !value)}
              className="flex-1 sm:flex-none"
            >
              <ClipboardPaste className="size-4" />
              Paste
            </Button>
          </div>
        </div>

        {showPaste ? (
          <div className="mb-3 space-y-2 rounded-xl border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">
              One per line, e.g. <code>Drop 123 - CB9 8QL</code>
            </p>
            <Textarea
              rows={4}
              placeholder={"Drop 123 - CB9 8QL\nDrop 456 - IP2 0UG"}
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
            />
            {pastePreview.unparsedLines.length > 0 ? (
              <p className="text-xs text-destructive">
                {pastePreview.unparsedLines.length} line(s) could not be parsed
              </p>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddPasteToTable}
              disabled={pastePreview.rows.length === 0}
            >
              Add {pastePreview.rows.length || ""} to list
            </Button>
          </div>
        ) : null}

        <div className="hidden grid-cols-[6rem_1fr_1fr_1fr_2.5rem] gap-2 px-1 pb-2 text-xs font-medium text-muted-foreground sm:grid">
          <span>Drop #</span>
          <span>Postcode</span>
          <span>Description</span>
          <span>Driver</span>
          <span />
        </div>

        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={index}
              className="rounded-xl border bg-background p-3 sm:border-0 sm:bg-transparent sm:p-0"
            >
              <div className="mb-2 flex items-center justify-between sm:hidden">
                <span className="text-xs font-semibold text-muted-foreground">
                  Drop {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRow(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-[6rem_1fr_1fr_1fr_2.5rem] sm:items-center">
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground sm:hidden">
                    Drop #
                  </span>
                  <Input
                    placeholder="123"
                    value={row.dropNumber}
                    inputMode="numeric"
                    onChange={(event) =>
                      updateRow(index, { dropNumber: event.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground sm:hidden">
                    Postcode
                  </span>
                  <Select
                    value={row.postcode || undefined}
                    onValueChange={(value) =>
                      updateRow(index, { postcode: value ?? "" })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSTCODE_OPTIONS.map((postcode) => (
                        <SelectItem key={postcode} value={postcode}>
                          {postcode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground sm:hidden">
                    Description
                  </span>
                  <Input
                    placeholder="Optional"
                    value={row.notes ?? row.location ?? ""}
                    onChange={(event) => {
                      const value = event.target.value || null
                      updateRow(index, { notes: value, location: value })
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground sm:hidden">
                    Driver
                  </span>
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
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRow(index)}
                  className="hidden sm:flex"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="mt-3 w-full sm:w-auto"
        >
          <Plus className="size-4" />
          Add drop
        </Button>
      </SectionCard>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <p className="hidden text-sm text-muted-foreground sm:block">
            {filledCount} drop{filledCount === 1 ? "" : "s"} ready
          </p>
          <Button
            size="lg"
            onClick={handlePrepare}
            disabled={isPreparing}
            className={cn("ml-auto w-full sm:w-auto sm:min-w-56", WA_GREEN)}
          >
            <MessageCircle className="size-4" />
            {isPreparing ? "Preparing…" : "Prepare WhatsApp messages"}
          </Button>
        </div>
      </div>
    </div>
  )
}
