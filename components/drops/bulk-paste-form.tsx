"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { bulkCreateDrops } from "@/lib/actions/drops"
import { parseDropPaste } from "@/lib/services/drop-parser"

export function BulkPasteForm() {
  const router = useRouter()
  const [text, setText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const preview = useMemo(() => parseDropPaste(text), [text])

  async function handleCreate() {
    if (preview.rows.length === 0) {
      toast.error("No valid drops to create")
      return
    }

    setIsSubmitting(true)
    const result = await bulkCreateDrops(preview.rows)
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
      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          Paste lines like <code>Drop 123 - IP4 1LS</code> or{" "}
          <code>Drop 456 - IP1 2AB, Tesco Extra</code>.
        </p>
        <Textarea
          rows={10}
          placeholder={"Drop 123 - IP4 1LS\nDrop 456 - IP1 2AB, Tesco Extra"}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      {preview.unparsedLines.length > 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">
            {preview.unparsedLines.length} line(s) could not be parsed:
          </p>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground">
            {preview.unparsedLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview.rows.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Preview ({preview.rows.length} drop{preview.rows.length === 1 ? "" : "s"})
          </p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drop #</TableHead>
                  <TableHead>Postcode</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row, index) => (
                  <TableRow key={`${row.dropNumber}-${index}`}>
                    <TableCell>{row.dropNumber}</TableCell>
                    <TableCell>{row.postcode}</TableCell>
                    <TableCell>{row.location ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      <Button
        onClick={handleCreate}
        disabled={isSubmitting || preview.rows.length === 0}
      >
        {isSubmitting
          ? "Creating..."
          : `Create ${preview.rows.length || ""} drop${preview.rows.length === 1 ? "" : "s"}`}
      </Button>
    </div>
  )
}
