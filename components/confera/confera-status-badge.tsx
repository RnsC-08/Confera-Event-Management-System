import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const palette = {
  blue: "border-blue-200 bg-blue-50 text-blue-700 shadow-blue-900/5",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700 shadow-cyan-900/5",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-emerald-900/5",
  amber: "border-amber-200 bg-amber-50 text-amber-700 shadow-amber-900/5",
  slate: "border-slate-200 bg-slate-100 text-slate-700 shadow-slate-900/5",
  red: "border-rose-200 bg-rose-50 text-rose-700 shadow-rose-900/5",
}

function getTone(value: string) {
  switch (value) {
    case "Confirmed":
    case "Paid":
    case "Completed":
    case "Available":
      return palette.green
    case "Draft":
    case "Partial":
    case "Reserved":
    case "Assigned":
    case "In preparation":
      return palette.blue
    case "InProgress":
    case "In use":
      return palette.cyan
    case "Unpaid":
    case "Maintenance":
    case "Pending":
      return palette.amber
    case "Under maintenance":
    case "Cancelled":
    case "Unavailable":
    case "Failed":
      return palette.red
    case "Refunded":
      return palette.cyan
    default:
      return palette.slate
  }
}

export function ConferaStatusBadge({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] shadow-sm",
        getTone(value),
        className,
      )}
    >
      {value}
    </Badge>
  )
}
