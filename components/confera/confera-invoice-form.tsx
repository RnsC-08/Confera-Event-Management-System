"use client"

import { FormEvent, useState } from "react"
import { Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Invoice, InvoiceBooking } from "@/components/confera/confera-invoice-types"

const inputClass = "border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-100"
const selectClass = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"

export function ConferaInvoiceForm({
  open,
  invoice,
  bookings,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  invoice: Invoice | null
  bookings: InvoiceBooking[]
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: Record<string, unknown>, editing: boolean) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const taxAmount = Number(form.get("tax_amount"))
    if (!Number.isFinite(taxAmount) || taxAmount < 0) return setError("Tax amount must be 0 or greater.")
    const payload = {
      ...(invoice
        ? { invoice_id: invoice.invoice_id }
        : { event_booking_id: Number(form.get("event_booking_id")) }),
      ...(!taxLocked ? { tax_amount: taxAmount } : {}),
      notes: String(form.get("notes") ?? "").trim() || null,
    }
    try {
      setSaving(true)
      await onSubmit(payload, Boolean(invoice))
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save the invoice.")
    } finally {
      setSaving(false)
    }
  }

  const taxLocked = Boolean(invoice && Number(invoice.paid_amount) > 0)

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setError(null); onOpenChange(next) }}>
      <DialogContent className="border-blue-100 sm:max-w-xl">
        <DialogHeader><DialogTitle>{invoice ? "Edit Invoice" : "Generate Invoice"}</DialogTitle><DialogDescription>{invoice ? "Update invoice notes and tax before payments are recorded." : "Generate an invoice from the booking price snapshots and assigned items."}</DialogDescription></DialogHeader>
        <form key={invoice?.invoice_id ?? "new"} onSubmit={handleSubmit} className="space-y-5">
          {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div className="space-y-4">
            {!invoice && <div className="space-y-2"><Label htmlFor="invoice-booking">Event booking <span className="text-rose-600">*</span></Label><select id="invoice-booking" name="event_booking_id" required defaultValue="" className={selectClass}><option value="" disabled>Select a booking</option>{bookings.map((booking) => <option key={booking.event_booking_id} value={booking.event_booking_id}>{booking.booking_reference} - {booking.event_title} - {booking.client_name} - {booking.event_date.slice(0, 10)}</option>)}</select>{bookings.length === 0 && <p className="text-xs text-amber-700">No eligible bookings are available without an invoice.</p>}</div>}
            {invoice && <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3"><p className="text-sm font-medium text-slate-800">{invoice.invoice_number}</p><p className="mt-1 text-xs text-slate-500">{invoice.booking_reference} - {invoice.event_title}</p></div>}
            <div className="space-y-2"><Label htmlFor="invoice-tax">Tax amount</Label><Input id="invoice-tax" name="tax_amount" type="number" min="0" step="0.01" defaultValue={invoice?.tax_amount ?? 0} disabled={taxLocked} className={inputClass} />{taxLocked && <p className="flex items-center gap-1 text-xs text-amber-700"><Info className="size-3.5" />Tax cannot be changed after payments are recorded.</p>}</div>
            <div className="space-y-2"><Label htmlFor="invoice-notes">Notes</Label><Textarea id="invoice-notes" name="notes" defaultValue={invoice?.notes ?? ""} rows={3} className={inputClass} /></div>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving || (!invoice && bookings.length === 0)} className="bg-[#1648b8] text-white hover:bg-[#123b98]">{saving && <Loader2 className="animate-spin" />}{saving ? "Saving..." : invoice ? "Save Changes" : "Generate Invoice"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
