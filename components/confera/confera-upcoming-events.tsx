import { CalendarRange, Clock3, MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConferaStatusBadge } from "@/components/confera/confera-status-badge"
import type { ConferaUpcomingEvent } from "@/components/confera/confera-types"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function formatTime(value: string) {
  const [hour, minute] = value.split(":")
  const date = new Date()
  date.setHours(Number(hour), Number(minute), 0, 0)
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date)
}

export function ConferaUpcomingEvents({ items }: { items: ConferaUpcomingEvent[] }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-blue-100/90 bg-[linear-gradient(180deg,#ffffff_0%,#f1f8ff_100%)] shadow-[0_14px_36px_rgba(15,45,100,0.12)] transition-shadow duration-200 hover:shadow-[0_18px_44px_rgba(15,72,184,0.15)]">
      <CardHeader className="border-b border-blue-100/80 bg-[linear-gradient(135deg,#f8fcff_0%,#eaf5ff_100%)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-800 shadow-sm ring-1 ring-blue-200"><CalendarRange className="size-5" /></div>
          <div><CardTitle className="text-base text-slate-900">Upcoming Events</CardTitle><CardDescription>Next bookings on the event calendar.</CardDescription></div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-blue-200 bg-blue-50/70 p-8 text-center text-sm text-slate-500">No upcoming events.</p>
        ) : (
          <div className="divide-y divide-blue-100/70 overflow-hidden rounded-xl border border-blue-100/90 bg-white/72 shadow-sm">
            {items.map((item) => (
              <article key={item.event_booking_id} className="p-4 transition-colors hover:bg-cyan-50/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold text-slate-900">{item.event_title}</h3><ConferaStatusBadge value={item.booking_status} /></div>
                    <p className="mt-1 text-xs text-slate-500">{item.booking_reference} · {item.event_type} · {item.client_name}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5"><CalendarRange className="size-3.5" />{formatDate(item.event_date)}</span>
                    <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{formatTime(item.start_time)} - {formatTime(item.end_time)}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{item.hall_name}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
