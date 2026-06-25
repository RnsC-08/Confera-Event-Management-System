import { ClipboardCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConferaStatusBadge } from "@/components/confera/confera-status-badge"
import type { ConferaStaffTask } from "@/components/confera/confera-types"

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value))
}

export function ConferaStaffTasks({ items }: { items: ConferaStaffTask[] }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-blue-100/90 bg-[linear-gradient(180deg,#ffffff_0%,#eff8ff_100%)] shadow-[0_14px_36px_rgba(15,45,100,0.12)] transition-shadow duration-200 hover:shadow-[0_18px_44px_rgba(15,72,184,0.15)]">
      <CardHeader className="border-b border-blue-100/80 bg-[linear-gradient(135deg,#f8fcff_0%,#eaf7ff_100%)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-800 shadow-sm ring-1 ring-sky-200"><ClipboardCheck className="size-5" /></div>
          <div><CardTitle className="text-base text-slate-900">Staff Tasks</CardTitle><CardDescription>Latest event assignments.</CardDescription></div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-sky-200 bg-sky-50/70 p-8 text-center text-sm text-slate-500">No staff tasks.</p>
        ) : (
          <div className="divide-y divide-blue-100/70 overflow-hidden rounded-xl border border-blue-100/90 bg-white/72 shadow-sm">
            {items.map((task) => (
              <article key={task.staff_assignment_id} className="p-3.5 transition-colors hover:bg-cyan-50/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="truncate text-sm font-medium text-slate-900">{task.event_title ?? "Untitled event"}</h3><p className="mt-1 text-xs text-slate-500">{task.booking_reference}</p></div>
                  <ConferaStatusBadge value={task.assignment_status} />
                </div>
                <p className="mt-3 text-xs text-slate-600"><span className="font-medium text-slate-800">{task.staff_name}</span> · {task.assignment_role}</p>
                <p className="mt-1 text-xs text-slate-400">Assigned {formatDateTime(task.assigned_at)}</p>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
