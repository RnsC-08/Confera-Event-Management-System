import { DoorOpen, UsersRound } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConferaStatusBadge } from "@/components/confera/confera-status-badge"
import type { ConferaHallStatus } from "@/components/confera/confera-types"

export function ConferaHallStatuses({ items }: { items: ConferaHallStatus[] }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-blue-100/90 bg-[linear-gradient(180deg,#ffffff_0%,#f0fbff_100%)] shadow-[0_14px_36px_rgba(15,45,100,0.12)] transition-shadow duration-200 hover:shadow-[0_18px_44px_rgba(15,72,184,0.15)]">
      <CardHeader className="border-b border-cyan-100/80 bg-[linear-gradient(135deg,#f8fcff_0%,#e7faff_100%)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800 shadow-sm ring-1 ring-cyan-200"><DoorOpen className="size-5" /></div>
          <div><CardTitle className="text-base text-slate-900">Hall Statuses</CardTitle><CardDescription>Current venue availability.</CardDescription></div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/70 p-8 text-center text-sm text-slate-500">No active halls.</p>
        ) : (
          <div className="divide-y divide-blue-100/70 overflow-hidden rounded-xl border border-blue-100/90 bg-white/72 shadow-sm">
            {items.map((hall) => (
              <article key={hall.event_hall_id} className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-cyan-50/60">
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
