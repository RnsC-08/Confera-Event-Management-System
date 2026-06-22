"use client"

import { FormEvent, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Equipment } from "@/components/confera/confera-equipment-types"
import { equipmentStatuses } from "@/components/confera/confera-equipment-types"

const inputClass = "border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-100"
const selectClass = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"

export function ConferaEquipmentForm({
  open,
  equipment,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  equipment: Equipment | null
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
    const quantityTotal = Number(form.get("quantity_total"))
    const quantityAvailable = Number(form.get("quantity_available"))
    const unitCost = Number(form.get("unit_cost"))

    if (!name) return setError("Name is required.")
    if (!category) return setError("Category is required.")
    if (!Number.isFinite(quantityTotal) || quantityTotal < 0) return setError("Total quantity must be 0 or greater.")
    if (!Number.isFinite(quantityAvailable) || quantityAvailable < 0) return setError("Available quantity must be 0 or greater.")
    if (quantityAvailable > quantityTotal) return setError("Available quantity cannot be greater than total quantity.")
    if (!Number.isFinite(unitCost) || unitCost < 0) return setError("Unit cost must be 0 or greater.")

    const payload = {
      ...(equipment ? { equipment_id: equipment.equipment_id } : {}),
      name,
      category,
      quantity_total: quantityTotal,
      quantity_available: quantityAvailable,
      unit_cost: unitCost,
      status: String(form.get("status")),
      notes: String(form.get("notes") ?? "").trim() || null,
      is_active: form.get("is_active") === "on",
    }

    try {
      setSaving(true)
      await onSubmit(payload, Boolean(equipment))
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save equipment.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setError(null); onOpenChange(next) }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-blue-100 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{equipment ? "Edit Equipment" : "New Equipment"}</DialogTitle>
          <DialogDescription>Manage equipment quantities, costs, availability, and maintenance status.</DialogDescription>
        </DialogHeader>
        <form key={equipment?.equipment_id ?? "new"} onSubmit={handleSubmit} className="space-y-5">
          {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="equipment-name">Name <span className="text-rose-600">*</span></Label><Input id="equipment-name" name="name" defaultValue={equipment?.name ?? ""} required className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="equipment-category">Category <span className="text-rose-600">*</span></Label><Input id="equipment-category" name="category" defaultValue={equipment?.category ?? ""} required placeholder="Audio, Lighting, Furniture..." className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="quantity-total">Total quantity <span className="text-rose-600">*</span></Label><Input id="quantity-total" name="quantity_total" type="number" min="0" step="1" defaultValue={equipment?.quantity_total ?? 0} required className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="quantity-available">Available quantity <span className="text-rose-600">*</span></Label><Input id="quantity-available" name="quantity_available" type="number" min="0" step="1" defaultValue={equipment?.quantity_available ?? 0} required className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="unit-cost">Unit cost <span className="text-rose-600">*</span></Label><Input id="unit-cost" name="unit_cost" type="number" min="0" step="0.01" defaultValue={equipment?.unit_cost ?? 0} required className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="equipment-status">Status <span className="text-rose-600">*</span></Label><select id="equipment-status" name="status" defaultValue={equipment?.status ?? "Available"} className={selectClass}>{equipmentStatuses.map((status) => <option key={status}>{status}</option>)}</select></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="equipment-notes">Notes</Label><Textarea id="equipment-notes" name="notes" defaultValue={equipment?.notes ?? ""} rows={3} className={inputClass} /></div>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" name="is_active" defaultChecked={equipment ? Boolean(equipment.is_active) : true} className="size-4 accent-blue-700" /> Active equipment</label>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving} className="bg-[#1648b8] text-white hover:bg-[#123b98]">{saving && <Loader2 className="animate-spin" />}{saving ? "Saving..." : equipment ? "Save Changes" : "Create Equipment"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
