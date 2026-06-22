"use client"

import { FormEvent, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Invoice, Payment, PaymentMethod, PaymentStatus } from "@/components/confera/confera-invoice-types"

const paymentMethods: PaymentMethod[] = ["Cash", "Card", "Transfer", "Other"]
const paymentStatuses: PaymentStatus[] = ["Pending", "Completed", "Failed", "Refunded"]
const inputClass = "border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-100"
const selectClass = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"

export function ConferaPaymentForm({
  open,
  payment,
  invoices,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  payment: Payment | null
  invoices: Invoice[]
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: Record<string, unknown>, editing: boolean) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("")
  const selectedInvoice = invoices.find((invoice) => invoice.invoice_id === Number(selectedInvoiceId))
  const remaining = selectedInvoice ? Math.max(0, Number(selectedInvoice.total_amount) - Number(selectedInvoice.paid_amount)) : null

  useEffect(() => {
    if (!open) {
      setError(null)
      setSelectedInvoiceId("")
    }
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    if (payment) {
      try {
        setSaving(true)
        await onSubmit({ payment_id: payment.payment_id, notes: String(form.get("notes") ?? "").trim() || null }, true)
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Unable to update payment notes.")
      } finally { setSaving(false) }
      return
    }

    const amount = Number(form.get("amount"))
    const status = String(form.get("status")) as PaymentStatus
    if (!Number.isFinite(amount) || amount <= 0) return setError("Payment amount must be greater than 0.")
    if (status === "Completed" && remaining !== null && amount > remaining) return setError("Payment amount is higher than the remaining invoice balance.")
    const payload = {
      invoice_id: Number(form.get("invoice_id")),
      amount,
      payment_method: String(form.get("payment_method")),
      status,
      reference_number: String(form.get("reference_number") ?? "").trim() || null,
      notes: String(form.get("notes") ?? "").trim() || null,
    }
    try {
      setSaving(true)
      await onSubmit(payload, false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to record payment.")
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { setError(null); setSelectedInvoiceId("") }; onOpenChange(next) }}>
      <DialogContent className="border-blue-100 sm:max-w-xl">
        <DialogHeader><DialogTitle>{payment ? "Edit Payment Notes" : "Record Payment"}</DialogTitle><DialogDescription>{payment ? "Only payment notes can be changed by the current API." : "Record a payment against an existing invoice."}</DialogDescription></DialogHeader>
        <form key={payment?.payment_id ?? "new"} onSubmit={handleSubmit} className="space-y-5">
          {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div className="space-y-4">
            {payment ? <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3"><p className="text-sm font-medium">{payment.invoice_number}</p><p className="mt-1 text-xs text-slate-500">{payment.reference_number || `Payment #${payment.payment_id}`} - EUR {Number(payment.amount).toFixed(2)}</p></div> : <>
              <div className="space-y-2"><Label htmlFor="payment-invoice">Invoice <span className="text-rose-600">*</span></Label><select id="payment-invoice" name="invoice_id" required value={selectedInvoiceId} onChange={(event) => setSelectedInvoiceId(event.target.value)} className={selectClass}><option value="" disabled>Select an invoice</option>{invoices.map((invoice) => { const balance = Math.max(0, Number(invoice.total_amount) - Number(invoice.paid_amount)); return <option key={invoice.invoice_id} value={invoice.invoice_id}>{invoice.invoice_number} - {invoice.client_name} - {invoice.event_title} - Remaining EUR {balance.toFixed(2)}</option> })}</select></div>
              {remaining !== null && <div className="rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2 text-sm text-blue-700">Remaining balance: <strong>EUR {remaining.toFixed(2)}</strong></div>}
              <div className="space-y-2"><Label htmlFor="payment-amount">Amount <span className="text-rose-600">*</span></Label><Input id="payment-amount" name="amount" type="number" min="0.01" step="0.01" required className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="payment-method">Method <span className="text-rose-600">*</span></Label><select id="payment-method" name="payment_method" defaultValue="Cash" className={selectClass}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></div><div className="space-y-2"><Label htmlFor="payment-status">Status</Label><select id="payment-status" name="status" defaultValue="Completed" className={selectClass}>{paymentStatuses.map((status) => <option key={status}>{status}</option>)}</select></div></div>
              <div className="space-y-2"><Label htmlFor="payment-reference">Reference number</Label><Input id="payment-reference" name="reference_number" className={inputClass} /></div>
            </>}
            <div className="space-y-2"><Label htmlFor="payment-notes">Notes</Label><Textarea id="payment-notes" name="notes" defaultValue={payment?.notes ?? ""} rows={3} className={inputClass} /></div>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving || (!payment && invoices.length === 0)} className="bg-[#1648b8] text-white hover:bg-[#123b98]">{saving && <Loader2 className="animate-spin" />}{saving ? "Saving..." : payment ? "Save Notes" : "Record Payment"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
