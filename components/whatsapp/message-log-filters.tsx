"use client"

import { useRouter } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MessageStatus } from "@/lib/generated/prisma/enums"

const statusOptions: Array<{ value: MessageStatus | "all"; label: string }> =
  [
    { value: "all", label: "All statuses" },
    { value: MessageStatus.QUEUED, label: "Queued" },
    { value: MessageStatus.SENT, label: "Sent" },
    { value: MessageStatus.FAILED, label: "Failed" },
  ]

type MessageLogFiltersProps = {
  initialStatus?: MessageStatus
}

export function MessageLogFilters({ initialStatus }: MessageLogFiltersProps) {
  const router = useRouter()

  function applyStatus(value: string) {
    const params = new URLSearchParams()
    if (value !== "all") {
      params.set("status", value)
    }
    const search = params.toString()
    router.push(search ? `/message-logs?${search}` : "/message-logs")
  }

  return (
    <Select
      value={initialStatus ?? "all"}
      onValueChange={(value) => applyStatus(value ?? "all")}
    >
      <SelectTrigger className="w-44">
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
  )
}
