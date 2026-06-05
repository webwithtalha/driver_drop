import { DropStatus } from "@/lib/generated/prisma/enums"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusConfig: Record<
  DropStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pending", variant: "secondary" },
  ASSIGNED: { label: "Assigned", variant: "default" },
  SENT: { label: "Sent", variant: "outline" },
  FAILED: { label: "Failed", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
  COMPLETED: { label: "Completed", variant: "outline" },
}

export function DropStatusBadge({
  status,
  className,
}: {
  status: DropStatus
  className?: string
}) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  )
}
