"use client"

import { FormEvent, useState } from "react"
import { Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ServicePackage } from "@/components/confera/confera-service-types"

const inputClass = "border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-100"

export function ConferaServicePackageForm({
  open,
  servicePackage,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  servicePackage: ServicePackage | null
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
    const price = Number(form.get("price"))
    if (!name) return setError("Name is required.")
    if (!Number.isFinite(price) || price < 0) return setError("Price must be 0 or greater.")
    const payload = {
      ...(servicePackage ? { service_package_id: servicePackage.service_package_id } : {}),
      name,
      description: String(form.get("description") ?? "").trim() || null,
      price,
      is_active: form.get("is_active") === "on",
      ...(!servicePackage ? { items: [] } : {}),
    }
    try {
      setSaving(true)
      await onSubmit(payload, Boolean(servicePackage))
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save the service package.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setError(null); onOpenChange(next) }}>
      <DialogContent className="border-blue-100 sm:max-w-xl">
        <DialogHeader><DialogTitle>{servicePackage ? "Edit Service Package" : "New Service Package"}</DialogTitle><DialogDescription>Manage package name, description, price, and availability.</DialogDescription></DialogHeader>
        <form key={servicePackage?.service_package_id ?? "new"} onSubmit={handleSubmit} className="space-y-5">
          {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="package-name">Name <span className="text-rose-600">*</span></Label><Input id="package-name" name="name" defaultValue={servicePackage?.name ?? ""} required className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="package-price">Price <span className="text-rose-600">*</span></Label><Input id="package-price" name="price" type="number" min="0" step="0.01" defaultValue={servicePackage?.price ?? 0} required className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="package-description">Description</Label><Textarea id="package-description" name="description" defaultValue={servicePackage?.description ?? ""} rows={3} className={inputClass} /></div>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="is_active" defaultChecked={servicePackage ? Boolean(servicePackage.is_active) : true} className="size-4 accent-blue-700" /> Active package</label>
          </div>
          <div className="flex gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs leading-5 text-blue-700"><Info className="mt-0.5 size-4 shrink-0" /><span>Package items are displayed read-only in this version. This form saves package header information only.</span></div>
          <DialogFooter className="border-t border-slate-100 pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving} className="bg-[#1648b8] text-white hover:bg-[#123b98]">{saving && <Loader2 className="animate-spin" />}{saving ? "Saving..." : servicePackage ? "Save Changes" : "Create Package"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
