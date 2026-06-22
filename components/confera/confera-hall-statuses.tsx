import { DoorOpen, UsersRound } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConferaStatusBadge } from "@/components/confera/confera-status-badge"
import type { ConferaHallStatus } from "@/components/confera/confera-types"

export function ConferaHallStatuses({ items }: { items: ConferaHallStatus[] }) {
  return (
    <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)] transition-shadow duration-200 hover:shadow-[0_12px_30px_rgba(15,72,184,0.11)]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100"><DoorOpen className="size-5" /></div>
          <div><CardTitle className="text-base text-slate-900">Hall Statuses</CardTitle><CardDescription>Current venue availability.</CardDescription></div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-blue-100 bg-blue-50/30 p-8 text-center text-sm text-slate-500">No active halls.</p>
        ) : (
          <div className="divide-y divide-blue-50 overflow-hidden rounded-lg border border-blue-100/80">
            {items.map((hall) => (
              <article key={hall.event_hall_id} className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-blue-50/45">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium text-slate-900">{hall.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><UsersRound className="size-3.5" />Capacity {hall.capacity}{hall.code ? ` · ${hall.code}` : ""}</p>
                </div>
                <ConferaStatusBadge value={hall.status} />
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
