import { MessageStatus } from "@/lib/generated/prisma/enums"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusConfig: Record<
  MessageStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  QUEUED: { label: "Queued", variant: "secondary" },
  SENT: { label: "Sent", variant: "outline" },
  FAILED: { label: "Failed", variant: "destructive" },
}

export function MessageStatusBadge({
  status,
  className,
}: {
  status: MessageStatus
  className?: string
}) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  )
}
