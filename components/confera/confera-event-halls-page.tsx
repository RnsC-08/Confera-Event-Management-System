"use client"

import { FormEvent, useEffect, useState } from "react"
import { AlertCircle, DoorOpen, Loader2, Pencil, Plus, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ConferaPageShell } from "@/components/confera/confera-page-shell"
import { ConferaAccessNotice } from "@/components/confera/confera-access-notice"
import { ConferaStatusBadge } from "@/components/confera/confera-status-badge"
import { useAuth } from "@/lib/auth-context"
import { canViewFinancialData, canWriteConferaResource } from "@/lib/confera-permissions"

const hallStatuses = ["Available", "Reserved", "In preparation", "In use", "Completed", "Under maintenance"] as const
type HallStatus = (typeof hallStatuses)[number]
type EventHall = { event_hall_id: number; name: string; code: string | null; capacity: number; base_price: number | string; status: HallStatus; location_description: string | null; maintenance_notes: string | null; is_active: number }

class HallApiError extends Error { constructor(message: string, readonly status: number) { super(message) } }
async function hallRequest<T>(init?: RequestInit) {
  const response = await fetch("/api/confera/event-halls", { cache: "no-store", ...init })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new HallApiError(response.status === 500 ? "The system could not process the hall request. Please try again." : json?.error || `Request failed (${response.status})`, response.status)
  return json as T
}

const inputClass = "border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-100"
const selectClass = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"

function HallForm({ open, hall, onOpenChange, onSaved }: { open: boolean; hall: EventHall | null; onOpenChange: (open: boolean) => void; onSaved: (hall: EventHall, editing: boolean) => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const capacity = Number(form.get("capacity"))
    const basePrice = Number(form.get("base_price"))
    if (capacity < 0 || !Number.isFinite(capacity)) return setError("Capacity must be 0 or greater.")
    if (basePrice < 0 || !Number.isFinite(basePrice)) return setError("Base price must be 0 or greater.")
    const payload = { ...(hall ? { event_hall_id: hall.event_hall_id } : {}), name: String(form.get("name")).trim(), code: String(form.get("code") ?? "").trim() || null, capacity, base_price: basePrice, status: String(form.get("status")), location_description: String(form.get("location_description") ?? "").trim() || null, maintenance_notes: String(form.get("maintenance_notes") ?? "").trim() || null, is_active: form.get("is_active") === "on" }
    try {
      setSaving(true)
      const saved = await hallRequest<EventHall>({ method: hall ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      onSaved(saved, Boolean(hall))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save the event hall.")
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setError(null); onOpenChange(next) }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-blue-100 sm:max-w-2xl">
        <DialogHeader><DialogTitle>{hall ? "Edit Event Hall" : "New Event Hall"}</DialogTitle><DialogDescription>Manage hall details, pricing, availability, and maintenance information.</DialogDescription></DialogHeader>
        <form key={hall?.event_hall_id ?? "new"} onSubmit={submit} className="space-y-5">
          {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="hall-name">Name <span className="text-rose-600">*</span></Label><Input id="hall-name" name="name" defaultValue={hall?.name ?? ""} required className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="hall-code">Code</Label><Input id="hall-code" name="code" defaultValue={hall?.code ?? ""} className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="hall-capacity">Capacity <span className="text-rose-600">*</span></Label><Input id="hall-capacity" name="capacity" type="number" min="0" step="1" defaultValue={hall?.capacity ?? 0} required className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="hall-price">Base price <span className="text-rose-600">*</span></Label><Input id="hall-price" name="base_price" type="number" min="0" step="0.01" defaultValue={hall?.base_price ?? 0} required className={inputClass} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="hall-status">Status <span className="text-rose-600">*</span></Label><select id="hall-status" name="status" defaultValue={hall?.status ?? "Available"} className={selectClass}>{hallStatuses.map((status) => <option key={status}>{status}</option>)}</select></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="hall-location">Location description</Label><Textarea id="hall-location" name="location_description" defaultValue={hall?.location_description ?? ""} rows={2} className={inputClass} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="hall-maintenance">Maintenance notes</Label><Textarea id="hall-maintenance" name="maintenance_notes" defaultValue={hall?.maintenance_notes ?? ""} rows={2} className={inputClass} /></div>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" name="is_active" defaultChecked={hall ? Boolean(hall.is_active) : true} className="size-4 rounded border-slate-300 accent-blue-700" /> Active hall</label>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving} className="bg-[#1648b8] text-white hover:bg-[#123b98]">{saving && <Loader2 className="animate-spin" />}{saving ? "Saving..." : hall ? "Save Changes" : "Create Hall"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ConferaEventHallsPage() {
  const { user } = useAuth()
  const canManage = Boolean(user && canWriteConferaResource(user.role_name, "halls"))
  const showFinancialData = Boolean(user && canViewFinancialData(user.role_name))
  const [halls, setHalls] = useState<EventHall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EventHall | null>(null)

  async function load() { try { setLoading(true); setError(null); setHalls(await hallRequest<EventHall[]>()) } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Failed to load event halls.") } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])

  const term = search.trim().toLowerCase()
  const filtered = halls.filter((hall) => (!term || hall.name.toLowerCase().includes(term) || hall.code?.toLowerCase().includes(term) || hall.location_description?.toLowerCase().includes(term)) && (!status || hall.status === status))

  return (
    <ConferaPageShell activeItem="event-halls">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 border-b border-blue-100 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-semibold text-slate-950">Event Halls</h1><p className="mt-1 text-sm text-slate-500">Manage halls, capacity, availability and maintenance status.</p></div>{canManage && <Button onClick={() => { setEditing(null); setFormOpen(true) }} className="w-fit bg-[#1648b8] text-white hover:bg-[#123b98]"><Plus />New Hall</Button>}</header>
        {!canManage && <ConferaAccessNotice />}
        {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
        {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="size-4" />{error}<Button variant="ghost" size="sm" className="ml-auto" onClick={() => void load()}><RefreshCw />Retry</Button></div>}
        <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(220px,1fr)_220px_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search halls" className="pl-9" /></div><select value={status} onChange={(event) => setStatus(event.target.value)} className={selectClass}><option value="">All statuses</option>{hallStatuses.map((item) => <option key={item}>{item}</option>)}</select><Button variant="ghost" onClick={() => { setSearch(""); setStatus("") }}>Clear</Button></CardContent></Card>
        <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardHeader><CardTitle className="text-base">Halls <span className="ml-1 font-normal text-slate-400">({filtered.length})</span></CardTitle></CardHeader><CardContent>
          {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin text-blue-700" />Loading event halls...</div> : filtered.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-blue-100 bg-blue-50/25 text-center"><DoorOpen className="size-6 text-blue-700" /><p className="mt-3 text-sm font-medium">No event halls found</p></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map((hall) => <article key={hall.event_hall_id} className="rounded-xl border border-blue-100 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><h2 className="font-medium text-slate-900">{hall.name}</h2><p className="mt-1 text-xs text-slate-500">{hall.code || "No code"}</p></div><ConferaStatusBadge value={hall.status} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-slate-400">Capacity</p><p className="mt-1 font-medium">{hall.capacity}</p></div>{showFinancialData && <div><p className="text-xs text-slate-400">Base price</p><p className="mt-1 font-medium">EUR {Number(hall.base_price).toFixed(2)}</p></div>}</div><p className="mt-3 line-clamp-2 text-xs text-slate-500">{hall.location_description || "No location description"}</p>{hall.maintenance_notes && <p className="mt-2 line-clamp-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-700">{hall.maintenance_notes}</p>}<div className="mt-4 flex items-center justify-between border-t border-blue-50 pt-3"><span className="text-xs text-emerald-600">{hall.is_active ? "Active" : "Inactive"}</span>{canManage && <Button size="sm" variant="ghost" onClick={() => { setEditing(hall); setFormOpen(true) }} className="text-blue-700 hover:bg-blue-50"><Pencil />Edit</Button>}</div></article>)}</div>}
        </CardContent></Card>
      </div>
      {canManage && <HallForm open={formOpen} hall={editing} onOpenChange={setFormOpen} onSaved={(_hall, wasEditing) => { setFormOpen(false); setNotice(wasEditing ? "Event hall updated successfully." : "Event hall created successfully."); void load() }} />}
    </ConferaPageShell>
  )
}
