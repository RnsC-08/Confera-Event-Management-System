import type { LucideIcon } from "lucide-react"
import {
  Boxes,
  CalendarCheck2,
  ClipboardCheck,
  ClipboardPenLine,
  DoorOpen,
  FileClock,
  FileText,
  UsersRound,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { ConferaCounts } from "@/components/confera/confera-types"

type StatCard = {
  label: string
  value: number
  icon: LucideIcon
  tone: string
  accent: string
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

export function ConferaStatCards({
  counts,
  staffTaskCount,
}: {
  counts: ConferaCounts
  staffTaskCount: number
}) {
  const cards: StatCard[] = [
    { label: "Active Halls", value: counts.total_active_halls, icon: DoorOpen, tone: "bg-blue-50 text-blue-700 ring-blue-100", accent: "bg-blue-500" },
    { label: "Active Clients", value: counts.total_active_clients, icon: UsersRound, tone: "bg-cyan-50 text-cyan-700 ring-cyan-100", accent: "bg-cyan-500" },
    { label: "Confirmed Bookings", value: counts.total_confirmed_bookings, icon: CalendarCheck2, tone: "bg-emerald-50 text-emerald-700 ring-emerald-100", accent: "bg-emerald-500" },
    { label: "Draft Bookings", value: counts.total_draft_bookings, icon: ClipboardPenLine, tone: "bg-slate-100 text-slate-700 ring-slate-200", accent: "bg-slate-400" },
    { label: "Unpaid Invoices", value: counts.total_unpaid_invoices, icon: FileClock, tone: "bg-amber-50 text-amber-700 ring-amber-100", accent: "bg-amber-500" },
    { label: "Paid Invoices", value: counts.total_paid_invoices, icon: FileText, tone: "bg-green-50 text-green-700 ring-green-100", accent: "bg-green-500" },
    { label: "Available Equipment", value: counts.total_available_equipment, icon: Boxes, tone: "bg-indigo-50 text-indigo-700 ring-indigo-100", accent: "bg-indigo-500" },
    { label: "Staff Tasks", value: staffTaskCount, icon: ClipboardCheck, tone: "bg-sky-50 text-sky-700 ring-sky-100", accent: "bg-sky-500" },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dashboard summary">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.label} className="group relative overflow-hidden rounded-xl border-blue-100/80 bg-white shadow-[0_6px_20px_rgba(15,45,100,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_28px_rgba(15,72,184,0.11)]">
            <div className={`absolute inset-y-0 left-0 w-1 ${card.accent}`} />
            <CardContent className="flex items-center justify-between p-4 pl-5">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(card.value)}</p>
              </div>
              <div className={`flex size-11 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-105 ${card.tone}`}>
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
