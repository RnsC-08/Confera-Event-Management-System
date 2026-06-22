"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Banknote, CircleDollarSign, Clock3, FileCheck2, FileText, Loader2, Pencil, Plus, ReceiptText, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConferaInvoiceForm } from "@/components/confera/confera-invoice-form"
import type { Invoice, InvoiceBooking, Payment } from "@/components/confera/confera-invoice-types"
import { ConferaPageShell } from "@/components/confera/confera-page-shell"
import { ConferaPaymentForm } from "@/components/confera/confera-payment-form"
import { ConferaStatusBadge } from "@/components/confera/confera-status-badge"

class BillingApiError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

async function billingRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new BillingApiError(
      response.status === 500
        ? "The billing system could not process the request. Please try again."
        : json?.error || `Request failed (${response.status})`,
      response.status,
    )
  }
  return json as T
}

function currency(value: number | string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(Number(value))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

const selectClass = "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"

export function ConferaInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [bookings, setBookings] = useState<InvoiceBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [invoiceSearch, setInvoiceSearch] = useState("")
  const [invoiceStatus, setInvoiceStatus] = useState("")
  const [paymentSearch, setPaymentSearch] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentStatus, setPaymentStatus] = useState("")
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false)
  const [paymentFormOpen, setPaymentFormOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const [nextInvoices, nextPayments, nextBookings] = await Promise.all([
        billingRequest<Invoice[]>("/api/confera/invoices"),
        billingRequest<Payment[]>("/api/confera/payments"),
        billingRequest<InvoiceBooking[]>("/api/confera/event-bookings"),
      ])
      setInvoices(nextInvoices)
      setPayments(nextPayments)
      setBookings(nextBookings)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load invoices and payments.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const invoicedBookingIds = new Set(invoices.map((invoice) => invoice.event_booking_id))
  const eligibleBookings = bookings.filter((booking) => booking.booking_status !== "Cancelled" && !invoicedBookingIds.has(booking.event_booking_id))
  const payableInvoices = invoices.filter((invoice) => Number(invoice.total_amount) - Number(invoice.paid_amount) > 0)
  const invoiceById = new Map(invoices.map((invoice) => [invoice.invoice_id, invoice]))

  const invoiceTerm = invoiceSearch.trim().toLowerCase()
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = !invoiceTerm || invoice.invoice_number.toLowerCase().includes(invoiceTerm) || invoice.booking_reference.toLowerCase().includes(invoiceTerm) || invoice.client_name.toLowerCase().includes(invoiceTerm) || invoice.event_title.toLowerCase().includes(invoiceTerm)
    return matchesSearch && (!invoiceStatus || invoice.invoice_status === invoiceStatus)
  })

  const paymentTerm = paymentSearch.trim().toLowerCase()
  const filteredPayments = payments.filter((payment) => {
    const invoice = invoiceById.get(payment.invoice_id)
    const matchesSearch = !paymentTerm || payment.invoice_number.toLowerCase().includes(paymentTerm) || payment.reference_number?.toLowerCase().includes(paymentTerm) || invoice?.booking_reference.toLowerCase().includes(paymentTerm) || invoice?.client_name.toLowerCase().includes(paymentTerm) || invoice?.event_title.toLowerCase().includes(paymentTerm)
    return matchesSearch && (!paymentMethod || payment.payment_method === paymentMethod) && (!paymentStatus || payment.status === paymentStatus)
  })

  const unpaidCount = invoices.filter((invoice) => invoice.invoice_status === "Unpaid").length
  const partialCount = invoices.filter((invoice) => invoice.invoice_status === "Partial").length
  const paidCount = invoices.filter((invoice) => invoice.invoice_status === "Paid").length
  const outstandingAmount = invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total_amount) - Number(invoice.paid_amount)), 0)

  async function saveInvoice(payload: Record<string, unknown>, editing: boolean) {
    try {
      await billingRequest<Invoice>("/api/confera/invoices", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      setInvoiceFormOpen(false)
      setNotice(editing ? "Invoice updated successfully." : "Invoice generated successfully.")
      setError(null)
      await load()
    } catch (requestError) {
      if (requestError instanceof BillingApiError && requestError.status === 409) throw new Error("An invoice already exists for this booking.")
      throw requestError
    }
  }

  async function savePayment(payload: Record<string, unknown>, editing: boolean) {
    try {
      await billingRequest<Payment>("/api/confera/payments", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      setPaymentFormOpen(false)
      setNotice(editing ? "Payment notes updated successfully." : "Payment recorded successfully.")
      setError(null)
      await load()
    } catch (requestError) {
      if (requestError instanceof BillingApiError && requestError.status === 409) throw new Error("Payment amount is higher than the remaining invoice balance.")
      throw requestError
    }
  }

  const summaryCards = [
    { label: "Unpaid Invoices", value: unpaidCount, icon: Clock3, tone: "bg-amber-50 text-amber-700" },
    { label: "Partial Invoices", value: partialCount, icon: ReceiptText, tone: "bg-blue-50 text-blue-700" },
    { label: "Paid Invoices", value: paidCount, icon: FileCheck2, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Outstanding", value: currency(outstandingAmount), icon: CircleDollarSign, tone: "bg-indigo-50 text-indigo-700" },
  ]

  return (
    <ConferaPageShell activeItem="invoices">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 border-b border-blue-100 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Invoices & Payments</h1><p className="mt-1 text-sm text-slate-500">Generate event invoices, track totals, and record payments.</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => { setEditingPayment(null); setPaymentFormOpen(true) }}><Banknote />Record Payment</Button><Button className="bg-[#1648b8] text-white hover:bg-[#123b98]" onClick={() => { setEditingInvoice(null); setInvoiceFormOpen(true) }}><Plus />Generate Invoice</Button></div>
        </header>

        {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
        {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="size-4 shrink-0" />{error}<Button variant="ghost" size="sm" className="ml-auto text-rose-700" onClick={() => void load()}><RefreshCw />Retry</Button></div>}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{summaryCards.map((item) => { const Icon = item.icon; return <Card key={item.label} className="rounded-xl border-blue-100/80 bg-white shadow-[0_6px_20px_rgba(15,45,100,0.07)]"><CardContent className="flex items-center justify-between p-4"><div><p className="text-sm text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p></div><div className={`flex size-11 items-center justify-center rounded-xl ${item.tone}`}><Icon className="size-5" /></div></CardContent></Card> })}</section>

        <Tabs defaultValue="invoices" className="gap-5">
          <TabsList className="h-11 border border-blue-100 bg-blue-50/70 p-1"><TabsTrigger value="invoices" className="px-4 data-[state=active]:text-blue-700"><FileText />Invoices</TabsTrigger><TabsTrigger value="payments" className="px-4 data-[state=active]:text-blue-700"><Banknote />Payments</TabsTrigger></TabsList>

          <TabsContent value="invoices" className="space-y-4">
            <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(220px,1fr)_200px_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={invoiceSearch} onChange={(event) => setInvoiceSearch(event.target.value)} placeholder="Search invoices" className="pl-9" /></div><select value={invoiceStatus} onChange={(event) => setInvoiceStatus(event.target.value)} className={selectClass}><option value="">All statuses</option><option>Unpaid</option><option>Partial</option><option>Paid</option></select><Button variant="ghost" onClick={() => { setInvoiceSearch(""); setInvoiceStatus("") }}>Clear</Button></CardContent></Card>
            <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardHeader><CardTitle className="text-base">Invoices <span className="font-normal text-slate-400">({filteredInvoices.length})</span></CardTitle></CardHeader><CardContent>
              {loading ? <Loading label="Loading invoices..." /> : filteredInvoices.length === 0 ? <Empty icon={FileText} label="No invoices found" /> : <div className="grid gap-4 xl:grid-cols-2">{filteredInvoices.map((invoice) => <article key={invoice.invoice_id} className="rounded-xl border border-blue-100 p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium text-slate-900">{invoice.invoice_number}</h3><p className="mt-1 text-xs text-slate-500">{invoice.booking_reference} - {invoice.event_title}</p><p className="mt-1 text-xs text-slate-400">{invoice.client_name} - {formatDate(invoice.invoice_date)}</p></div><ConferaStatusBadge value={invoice.invoice_status} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><Amount label="Hall" value={invoice.hall_amount} /><Amount label="Package" value={invoice.package_amount} /><Amount label="Services" value={invoice.services_amount} /><Amount label="Equipment" value={invoice.equipment_amount} /><Amount label="Discount" value={invoice.discount_amount} negative /><Amount label="Tax" value={invoice.tax_amount} /></div><div className="mt-4 flex items-end justify-between rounded-lg bg-slate-50 p-3"><div><p className="text-xs text-slate-400">Total / Paid</p><p className="mt-1 font-semibold text-slate-900">{currency(invoice.total_amount)} <span className="font-normal text-slate-400">/ {currency(invoice.paid_amount)}</span></p></div><p className="text-sm font-medium text-blue-700">Due {currency(Math.max(0, Number(invoice.total_amount) - Number(invoice.paid_amount)))}</p></div>{invoice.notes && <p className="mt-3 line-clamp-2 text-xs text-slate-500">{invoice.notes}</p>}<div className="mt-4 flex justify-end border-t border-blue-50 pt-3"><Button size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-50" onClick={() => { setEditingInvoice(invoice); setInvoiceFormOpen(true) }}><Pencil />Edit</Button></div></article>)}</div>}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_180px_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={paymentSearch} onChange={(event) => setPaymentSearch(event.target.value)} placeholder="Search payments" className="pl-9" /></div><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={selectClass}><option value="">All methods</option><option>Cash</option><option>Card</option><option>Transfer</option><option>Other</option></select><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className={selectClass}><option value="">All statuses</option><option>Pending</option><option>Completed</option><option>Failed</option><option>Refunded</option></select><Button variant="ghost" onClick={() => { setPaymentSearch(""); setPaymentMethod(""); setPaymentStatus("") }}>Clear</Button></CardContent></Card>
            <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardHeader><CardTitle className="text-base">Payments <span className="font-normal text-slate-400">({filteredPayments.length})</span></CardTitle></CardHeader><CardContent>
              {loading ? <Loading label="Loading payments..." /> : filteredPayments.length === 0 ? <Empty icon={Banknote} label="No payments found" /> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredPayments.map((payment) => { const invoice = invoiceById.get(payment.invoice_id); return <article key={payment.payment_id} className="rounded-xl border border-blue-100 p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium text-slate-900">{payment.reference_number || `Payment #${payment.payment_id}`}</h3><p className="mt-1 text-xs text-slate-500">{payment.invoice_number}{invoice ? ` - ${invoice.booking_reference}` : ""}</p></div><ConferaStatusBadge value={payment.status} /></div><p className="mt-4 text-2xl font-semibold text-slate-900">{currency(payment.amount)}</p><div className="mt-2 flex justify-between text-xs text-slate-500"><span>{payment.payment_method}</span><span>{formatDate(payment.payment_date)}</span></div>{invoice && <p className="mt-3 line-clamp-2 text-xs text-slate-500">{invoice.client_name} - {invoice.event_title}</p>}{payment.notes && <p className="mt-2 line-clamp-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500">{payment.notes}</p>}<div className="mt-4 flex justify-end border-t border-blue-50 pt-3"><Button size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-50" onClick={() => { setEditingPayment(payment); setPaymentFormOpen(true) }}><Pencil />Edit Notes</Button></div></article> })}</div>}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      <ConferaInvoiceForm open={invoiceFormOpen} invoice={editingInvoice} bookings={eligibleBookings} onOpenChange={setInvoiceFormOpen} onSubmit={saveInvoice} />
      <ConferaPaymentForm open={paymentFormOpen} payment={editingPayment} invoices={payableInvoices} onOpenChange={setPaymentFormOpen} onSubmit={savePayment} />
    </ConferaPageShell>
  )
}

function Amount({ label, value, negative = false }: { label: string; value: number | string; negative?: boolean }) {
  return <div className="rounded-md bg-slate-50 px-2 py-2"><p className="text-slate-400">{label}</p><p className="mt-1 font-medium text-slate-700">{negative && Number(value) > 0 ? "-" : ""}{currency(value)}</p></div>
}

function Loading({ label }: { label: string }) {
  return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin text-blue-700" />{label}</div>
}

function Empty({ icon: Icon, label }: { icon: typeof FileText; label: string }) {
  return <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-blue-100 bg-blue-50/25"><Icon className="size-6 text-blue-700" /><p className="mt-3 text-sm font-medium">{label}</p></div>
}
