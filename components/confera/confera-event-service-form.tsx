"use client"

import { FormEvent, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { EventService } from "@/components/confera/confera-service-types"
import { pricingModels } from "@/components/confera/confera-service-types"

const inputClass = "border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-100"
const selectClass = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"

export function ConferaEventServiceForm({
  open,
  service,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  service: EventService | null
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: Record<string, unknown>, editing: boolean) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const name = String(form.get("name") ?? "").trim()
    const category = String(form.get("category") ?? "").trim()
    const unitPrice = Number(form.get("unit_price"))
    if (!name) return setError("Name is required.")
    if (!category) return setError("Category is required.")
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return setError("Unit price must be 0 or greater.")

    const payload = {
      ...(service ? { event_service_id: service.event_service_id } : {}),
      name,
      category,
      unit_price: unitPrice,
      pricing_model: String(form.get("pricing_model")),
      unit_label: String(form.get("unit_label") ?? "").trim() || null,
      description: String(form.get("description") ?? "").trim() || null,
      is_active: form.get("is_active") === "on",
    }

    try {
      setSaving(true)
      await onSubmit(payload, Boolean(service))
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save the event service.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setError(null); onOpenChange(next) }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-blue-100 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{service ? "Edit Event Service" : "New Event Service"}</DialogTitle>
          <DialogDescription>Configure service pricing and how it is measured for bookings.</DialogDescription>
        </DialogHeader>
        <form key={service?.event_service_id ?? "new"} onSubmit={handleSubmit} className="space-y-5">
          {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="service-name">Name <span className="text-rose-600">*</span></Label><Input id="service-name" name="name" defaultValue={service?.name ?? ""} required className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="service-category">Category <span className="text-rose-600">*</span></Label><Input id="service-category" name="category" defaultValue={service?.category ?? ""} required placeholder="Catering, Decoration, AV..." className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="service-price">Unit price <span className="text-rose-600">*</span></Label><Input id="service-price" name="unit_price" type="number" min="0" step="0.01" defaultValue={service?.unit_price ?? 0} required className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="pricing-model">Pricing model <span className="text-rose-600">*</span></Label><select id="pricing-model" name="pricing_model" defaultValue={service?.pricing_model ?? "Flat"} className={selectClass}>{pricingModels.map((model) => <option key={model}>{model}</option>)}</select></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="unit-label">Unit label</Label><Input id="unit-label" name="unit_label" defaultValue={service?.unit_label ?? ""} placeholder="guest, hour, set..." className={inputClass} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="service-description">Description</Label><Textarea id="service-description" name="description" defaultValue={service?.description ?? ""} rows={3} className={inputClass} /></div>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" name="is_active" defaultChecked={service ? Boolean(service.is_active) : true} className="size-4 accent-blue-700" /> Active service</label>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving} className="bg-[#1648b8] text-white hover:bg-[#123b98]">{saving && <Loader2 className="animate-spin" />}{saving ? "Saving..." : service ? "Save Changes" : "Create Service"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
