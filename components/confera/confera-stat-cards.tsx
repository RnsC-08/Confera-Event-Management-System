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
  surface: string
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

export function ConferaStatCards({
  counts,
  staffTaskCount,
  showFinancialData = true,
}: {
  counts: ConferaCounts
  staffTaskCount: number
  showFinancialData?: boolean
}) {
  const cards: StatCard[] = [
    { label: "Active Halls", value: counts.total_active_halls, icon: DoorOpen, tone: "bg-blue-100 text-blue-800 ring-blue-200", accent: "bg-blue-500", surface: "bg-[linear-gradient(135deg,#ffffff_0%,#e8f3ff_100%)]" },
    { label: "Active Clients", value: counts.total_active_clients, icon: UsersRound, tone: "bg-cyan-100 text-cyan-800 ring-cyan-200", accent: "bg-cyan-500", surface: "bg-[linear-gradient(135deg,#ffffff_0%,#e5fbff_100%)]" },
    { label: "Confirmed Bookings", value: counts.total_confirmed_bookings, icon: CalendarCheck2, tone: "bg-emerald-100 text-emerald-800 ring-emerald-200", accent: "bg-emerald-500", surface: "bg-[linear-gradient(135deg,#ffffff_0%,#eafaf1_100%)]" },
    { label: "Draft Bookings", value: counts.total_draft_bookings, icon: ClipboardPenLine, tone: "bg-sky-100 text-sky-800 ring-sky-200", accent: "bg-sky-500", surface: "bg-[linear-gradient(135deg,#ffffff_0%,#eaf7ff_100%)]" },
    { label: "Unpaid Invoices", value: counts.total_unpaid_invoices, icon: FileClock, tone: "bg-amber-100 text-amber-800 ring-amber-200", accent: "bg-amber-500", surface: "bg-[linear-gradient(135deg,#ffffff_0%,#fff7dd_100%)]" },
    { label: "Paid Invoices", value: counts.total_paid_invoices, icon: FileText, tone: "bg-green-100 text-green-800 ring-green-200", accent: "bg-green-500", surface: "bg-[linear-gradient(135deg,#ffffff_0%,#eafaf1_100%)]" },
    { label: "Available Equipment", value: counts.total_available_equipment, icon: Boxes, tone: "bg-blue-100 text-blue-800 ring-blue-200", accent: "bg-blue-600", surface: "bg-[linear-gradient(135deg,#ffffff_0%,#edf5ff_100%)]" },
    { label: "Staff Tasks", value: staffTaskCount, icon: ClipboardCheck, tone: "bg-cyan-100 text-cyan-800 ring-cyan-200", accent: "bg-cyan-500", surface: "bg-[linear-gradient(135deg,#ffffff_0%,#e6fbff_100%)]" },
  ]
  const visibleCards = showFinancialData
    ? cards
    : cards.filter((card) => ["Active Halls", "Confirmed Bookings", "Available Equipment", "Staff Tasks"].includes(card.label))

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dashboard summary">
      {visibleCards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.label} className={`group relative overflow-hidden rounded-2xl border-blue-100/90 ${card.surface} shadow-[0_14px_34px_rgba(15,45,100,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_18px_42px_rgba(15,72,184,0.16)]`}>
            <div className={`absolute inset-y-0 left-0 w-1 ${card.accent}`} />
            <div className="pointer-events-none absolute -right-8 -top-10 size-24 rounded-full bg-cyan-200/30 blur-2xl transition-opacity duration-200 group-hover:opacity-90" />
            <CardContent className="flex items-center justify-between p-4 pl-5">
              <div>
                <p className="text-sm font-medium text-slate-600">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(card.value)}</p>
              </div>
              <div className={`flex size-11 items-center justify-center rounded-2xl shadow-sm ring-1 transition-transform duration-200 group-hover:scale-105 ${card.tone}`}>
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
