"use client"

import { useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { AlertCircle, Banknote, Boxes, CalendarDays, DoorOpen, FileBarChart, Loader2, RefreshCw, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConferaPageShell } from "@/components/confera/confera-page-shell"
import type { ReportRows, ReportType } from "@/components/confera/confera-report-types"
import { ConferaStatusBadge } from "@/components/confera/confera-status-badge"

type ReportTab = "overview" | ReportType
type OverviewResponse = { available_report_types: ReportType[] }

const reportDetails: Record<ReportType, { label: string; description: string; icon: LucideIcon }> = {
  bookings: { label: "Bookings", description: "Booking schedules, clients, halls, and status.", icon: CalendarDays },
  payments: { label: "Payments", description: "Recorded payments, methods, and status.", icon: Banknote },
  "hall-usage": { label: "Hall Usage", description: "Booking activity grouped by event hall.", icon: DoorOpen },
  equipment: { label: "Equipment", description: "Equipment quantities, availability, and status.", icon: Boxes },
  staff: { label: "Staff", description: "Assignment totals and completion workload.", icon: Users },
}

async function reportRequest<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(response.status === 500 ? "The system could not load report data. Please try again." : json?.error || `Request failed (${response.status})`)
  return json as T
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function currency(value: number | string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(Number(value))
}

export function ConferaReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("overview")
  const [availableTypes, setAvailableTypes] = useState<ReportType[]>([])
  const [reports, setReports] = useState<Partial<ReportRows>>({})
  const [loadingTab, setLoadingTab] = useState<ReportTab | null>("overview")
  const [errors, setErrors] = useState<Partial<Record<ReportTab, string>>>({})

  async function loadTab(tab: ReportTab, force = false) {
    if (!force && tab === "overview" && availableTypes.length > 0) return
    if (!force && tab !== "overview" && reports[tab] !== undefined) return
    try {
      setLoadingTab(tab)
      setErrors((current) => ({ ...current, [tab]: undefined }))
      if (tab === "overview") {
        const result = await reportRequest<OverviewResponse>("/api/confera/reports")
        setAvailableTypes(result.available_report_types)
      } else {
        const result = await reportRequest<{ type: ReportType; rows: ReportRows[ReportType] }>(`/api/confera/reports?type=${tab}`)
        setReports((current) => ({ ...current, [tab]: result.rows }))
      }
    } catch (loadError) {
      setErrors((current) => ({ ...current, [tab]: loadError instanceof Error ? loadError.message : "Failed to load report." }))
    } finally {
      setLoadingTab(null)
    }
  }

  useEffect(() => { void loadTab("overview") }, [])

  function changeTab(value: string) {
    const tab = value as ReportTab
    setActiveTab(tab)
    void loadTab(tab)
  }

  return (
    <ConferaPageShell activeItem="reports">
      <div className="space-y-6">
        <header className="rounded-2xl border border-blue-100/80 bg-white/75 px-5 py-5 shadow-[0_12px_34px_rgba(15,45,100,0.08)] backdrop-blur">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">View booking, payment, hall usage, equipment, and staff reports.</p>
        </header>

        <Tabs value={activeTab} onValueChange={changeTab} className="gap-5">
          <div className="overflow-x-auto pb-1"><TabsList className="h-12 min-w-max rounded-2xl border border-blue-100 bg-white/80 p-1.5 shadow-sm backdrop-blur"><TabsTrigger value="overview" className="rounded-xl px-4 text-slate-600 data-[state=active]:bg-[linear-gradient(135deg,#eaf4ff_0%,#f8fcff_100%)] data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"><FileBarChart />Overview</TabsTrigger>{(Object.keys(reportDetails) as ReportType[]).map((type) => { const detail = reportDetails[type]; const Icon = detail.icon; return <TabsTrigger key={type} value={type} className="rounded-xl px-4 text-slate-600 data-[state=active]:bg-[linear-gradient(135deg,#eaf4ff_0%,#f8fcff_100%)] data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"><Icon />{detail.label}</TabsTrigger> })}</TabsList></div>

          <TabsContent value="overview">
            <ReportContainer title="Available Reports" loading={loadingTab === "overview"} error={errors.overview} onRetry={() => void loadTab("overview", true)} empty={availableTypes.length === 0}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{availableTypes.map((type) => { const detail = reportDetails[type]; const Icon = detail.icon; return <button type="button" key={type} onClick={() => changeTab(type)} className="group rounded-2xl border border-blue-100 bg-[linear-gradient(180deg,#ffffff_0%,#f3f9ff_100%)] p-5 text-left shadow-[0_10px_28px_rgba(15,45,100,0.08)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_34px_rgba(22,72,184,0.14)]"><div className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#dff2ff_0%,#eef7ff_100%)] text-blue-700 ring-1 ring-blue-100 transition-transform group-hover:scale-105"><Icon className="size-5" /></div><h2 className="mt-4 font-semibold text-slate-900">{detail.label}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{detail.description}</p></button> })}</div>
            </ReportContainer>
          </TabsContent>

          {(Object.keys(reportDetails) as ReportType[]).map((type) => (
            <TabsContent key={type} value={type}>
              <ReportContainer title={`${reportDetails[type].label} Report`} loading={loadingTab === type} error={errors[type]} onRetry={() => void loadTab(type, true)} empty={(reports[type]?.length ?? 0) === 0}>
                <ReportTable type={type} rows={reports[type] ?? []} />
              </ReportContainer>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </ConferaPageShell>
  )
}

function ReportContainer({ title, loading, error, onRetry, empty, children }: { title: string; loading: boolean; error?: string; onRetry: () => void; empty: boolean; children: React.ReactNode }) {
  return <Card className="rounded-2xl border-blue-100/80 bg-white/90 shadow-[0_14px_36px_rgba(15,45,100,0.09)]"><CardHeader className="rounded-t-2xl border-b border-blue-50 bg-[linear-gradient(135deg,#f8fcff_0%,#eef7ff_100%)]"><CardTitle className="text-base text-slate-900">{title}</CardTitle></CardHeader><CardContent className="pt-6">{loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin text-blue-700" />Loading report...</div> : error ? <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-rose-50/35 text-center"><AlertCircle className="size-7 text-rose-600" /><p className="mt-3 text-sm text-rose-700">{error}</p><Button variant="outline" size="sm" className="mt-4" onClick={onRetry}><RefreshCw />Retry</Button></div> : empty ? <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-blue-100 bg-[linear-gradient(135deg,#f8fcff_0%,#eef7ff_100%)]"><div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100"><FileBarChart className="size-6" /></div><p className="mt-3 text-sm font-medium">No report data available</p></div> : children}</CardContent></Card>
}

function ReportTable({ type, rows }: { type: ReportType; rows: ReportRows[ReportType] }) {
  return <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white shadow-sm"><Table><TableHeader><ReportHeaders type={type} /></TableHeader><TableBody>{type === "bookings" && (rows as ReportRows["bookings"]).map((row) => <TableRow key={`${row.booking_reference}-${row.event_date}`}><TableCell className="font-medium text-slate-900">{row.booking_reference}</TableCell><TableCell>{row.event_title}</TableCell><TableCell>{row.client_name}</TableCell><TableCell>{row.hall_name}</TableCell><TableCell>{formatDate(row.event_date)}</TableCell><TableCell>{row.start_time.slice(0, 5)} - {row.end_time.slice(0, 5)}</TableCell><TableCell><ConferaStatusBadge value={row.booking_status} /></TableCell></TableRow>)}{type === "payments" && (rows as ReportRows["payments"]).map((row, index) => <TableRow key={`${row.invoice_number}-${row.payment_date}-${index}`}><TableCell className="font-medium text-slate-900">{row.invoice_number}</TableCell><TableCell>{row.client_name}</TableCell><TableCell>{row.event_title}</TableCell><TableCell>{formatDate(row.payment_date)}</TableCell><TableCell>{currency(row.amount)}</TableCell><TableCell>{row.payment_method}</TableCell><TableCell><ConferaStatusBadge value={row.status} /></TableCell></TableRow>)}{type === "hall-usage" && (rows as ReportRows["hall-usage"]).map((row) => <TableRow key={row.hall_name}><TableCell className="font-medium text-slate-900">{row.hall_name}</TableCell><TableCell>{row.total_bookings}</TableCell><TableCell>{row.confirmed_bookings}</TableCell><TableCell>{row.completed_bookings}</TableCell></TableRow>)}{type === "equipment" && (rows as ReportRows["equipment"]).map((row) => <TableRow key={row.equipment_name}><TableCell className="font-medium text-slate-900">{row.equipment_name}</TableCell><TableCell>{row.category}</TableCell><TableCell>{row.quantity_total}</TableCell><TableCell>{row.quantity_available}</TableCell><TableCell><ConferaStatusBadge value={row.status} /></TableCell></TableRow>)}{type === "staff" && (rows as ReportRows["staff"]).map((row) => <TableRow key={`${row.staff_name}-${row.role_name}`}><TableCell className="font-medium text-slate-900">{row.staff_name}</TableCell><TableCell>{row.role_name}</TableCell><TableCell>{row.total_assignments}</TableCell><TableCell>{row.completed_assignments}</TableCell><TableCell>{row.active_assignments}</TableCell></TableRow>)}</TableBody></Table></div>
}

function ReportHeaders({ type }: { type: ReportType }) {
  if (type === "bookings") return <TableRow><TableHead>Reference</TableHead><TableHead>Event</TableHead><TableHead>Client</TableHead><TableHead>Hall</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead></TableRow>
  if (type === "payments") return <TableRow><TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Event</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead></TableRow>
  if (type === "hall-usage") return <TableRow><TableHead>Hall</TableHead><TableHead>Total Bookings</TableHead><TableHead>Confirmed</TableHead><TableHead>Completed</TableHead></TableRow>
  if (type === "equipment") return <TableRow><TableHead>Equipment</TableHead><TableHead>Category</TableHead><TableHead>Total</TableHead><TableHead>Available</TableHead><TableHead>Status</TableHead></TableRow>
  return <TableRow><TableHead>Staff Member</TableHead><TableHead>System Role</TableHead><TableHead>Total Assignments</TableHead><TableHead>Completed</TableHead><TableHead>Active</TableHead></TableRow>
}
