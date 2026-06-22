import { ReceiptText } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConferaStatusBadge } from "@/components/confera/confera-status-badge"
import type { ConferaRecentInvoice } from "@/components/confera/confera-types"

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export function ConferaRecentInvoices({
  items,
}: {
  items: ConferaRecentInvoice[]
}) {
  return (
    <Card
      id="recent-invoices"
      className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)] transition-shadow duration-200 hover:shadow-[0_12px_30px_rgba(15,72,184,0.11)]"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <ReceiptText className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base text-slate-900">Recent Invoices</CardTitle>
            <CardDescription>
              Latest billing activity across event bookings.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <Empty className="rounded-lg border border-dashed border-blue-100 bg-blue-50/30">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptText className="size-5" />
              </EmptyMedia>
              <EmptyTitle>No invoices yet</EmptyTitle>
              <EmptyDescription>
                Newly generated invoices will show up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Invoice</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((invoice) => (
                    <TableRow key={invoice.invoice_id} className="transition-colors hover:bg-blue-50/45">
                      <TableCell className="font-semibold text-slate-900">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>{invoice.booking_reference}</TableCell>
                      <TableCell>{invoice.client_name}</TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {invoice.event_title}
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell>{formatCurrency(invoice.paid_amount)}</TableCell>
                      <TableCell>
                        <ConferaStatusBadge value={invoice.invoice_status} />
                      </TableCell>
                      <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 lg:hidden">
              {items.map((invoice) => (
                <article
                  key={invoice.invoice_id}
                  className="rounded-lg border border-blue-100/80 p-4 transition-colors hover:bg-blue-50/45"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {invoice.invoice_number}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {invoice.booking_reference} • {invoice.client_name}
                      </p>
                    </div>
                    <ConferaStatusBadge value={invoice.invoice_status} />
                  </div>
                  <p className="mt-4 text-sm text-slate-700">{invoice.event_title}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-md bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Total
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatCurrency(invoice.total_amount)}
                      </p>
                    </div>
                    <div className="rounded-md bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Paid
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatCurrency(invoice.paid_amount)}
                      </p>
                    </div>
                    <div className="rounded-md bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Date
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatDate(invoice.invoice_date)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
