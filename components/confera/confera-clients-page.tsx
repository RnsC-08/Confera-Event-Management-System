"use client"

import { FormEvent, useEffect, useState } from "react"
import { AlertCircle, Building2, Loader2, Mail, MapPin, Pencil, Phone, Plus, RefreshCw, Search, UserRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ConferaPageShell } from "@/components/confera/confera-page-shell"

const clientTypes = ["Individual", "Company", "Organization"] as const
type ClientType = (typeof clientTypes)[number]
type Client = { client_id: number; client_type: ClientType; full_name: string; organization_name: string | null; email: string | null; phone: string | null; address_line: string | null; tax_id: string | null; notes: string | null; is_active: number }

class ClientApiError extends Error { constructor(message: string, readonly status: number) { super(message) } }
async function clientRequest<T>(init?: RequestInit) {
  const response = await fetch("/api/confera/clients", { cache: "no-store", ...init })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new ClientApiError(response.status === 500 ? "The system could not process the client request. Please try again." : json?.error || `Request failed (${response.status})`, response.status)
  return json as T
}

const inputClass = "border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-100"
const selectClass = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
const clientTypeTone: Record<ClientType, string> = { Individual: "border-blue-200 bg-blue-50 text-blue-700", Company: "border-cyan-200 bg-cyan-50 text-cyan-700", Organization: "border-indigo-200 bg-indigo-50 text-indigo-700" }

function ClientForm({ open, client, onOpenChange, onSaved }: { open: boolean; client: Client | null; onOpenChange: (open: boolean) => void; onSaved: (editing: boolean) => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const fullName = String(form.get("full_name") ?? "").trim()
    if (!fullName) return setError("Full name is required.")
    const payload = { ...(client ? { client_id: client.client_id } : {}), client_type: String(form.get("client_type")), full_name: fullName, organization_name: String(form.get("organization_name") ?? "").trim() || null, email: String(form.get("email") ?? "").trim() || null, phone: String(form.get("phone") ?? "").trim() || null, address_line: String(form.get("address_line") ?? "").trim() || null, tax_id: String(form.get("tax_id") ?? "").trim() || null, notes: String(form.get("notes") ?? "").trim() || null, is_active: form.get("is_active") === "on" }
    try {
      setSaving(true)
      await clientRequest<Client>({ method: client ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      onSaved(Boolean(client))
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to save the client.") } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setError(null); onOpenChange(next) }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-blue-100 sm:max-w-2xl">
        <DialogHeader><DialogTitle>{client ? "Edit Client" : "New Client"}</DialogTitle><DialogDescription>Manage client, organizer, contact, and billing information.</DialogDescription></DialogHeader>
        <form key={client?.client_id ?? "new"} onSubmit={submit} className="space-y-5">
          {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="client-type">Client type <span className="text-rose-600">*</span></Label><select id="client-type" name="client_type" defaultValue={client?.client_type ?? "Individual"} className={selectClass}>{clientTypes.map((type) => <option key={type}>{type}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="client-name">Full name <span className="text-rose-600">*</span></Label><Input id="client-name" name="full_name" defaultValue={client?.full_name ?? ""} required className={inputClass} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="client-organization">Organization name</Label><Input id="client-organization" name="organization_name" defaultValue={client?.organization_name ?? ""} className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="client-email">Email</Label><Input id="client-email" name="email" type="email" defaultValue={client?.email ?? ""} className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="client-phone">Phone</Label><Input id="client-phone" name="phone" type="tel" defaultValue={client?.phone ?? ""} className={inputClass} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="client-address">Address</Label><Input id="client-address" name="address_line" defaultValue={client?.address_line ?? ""} className={inputClass} /></div>
            <div className="space-y-2"><Label htmlFor="client-tax">Tax ID</Label><Input id="client-tax" name="tax_id" defaultValue={client?.tax_id ?? ""} className={inputClass} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="client-notes">Notes</Label><Textarea id="client-notes" name="notes" defaultValue={client?.notes ?? ""} rows={3} className={inputClass} /></div>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" name="is_active" defaultChecked={client ? Boolean(client.is_active) : true} className="size-4 rounded border-slate-300 accent-blue-700" /> Active client</label>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving} className="bg-[#1648b8] text-white hover:bg-[#123b98]">{saving && <Loader2 className="animate-spin" />}{saving ? "Saving..." : client ? "Save Changes" : "Create Client"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ConferaClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)

  async function load() { try { setLoading(true); setError(null); setClients(await clientRequest<Client[]>()) } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Failed to load clients.") } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  const term = search.trim().toLowerCase()
  const filtered = clients.filter((client) => (!term || client.full_name.toLowerCase().includes(term) || client.organization_name?.toLowerCase().includes(term) || client.email?.toLowerCase().includes(term) || client.phone?.toLowerCase().includes(term)) && (!typeFilter || client.client_type === typeFilter))

  return (
    <ConferaPageShell activeItem="clients">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 border-b border-blue-100 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-semibold text-slate-950">Clients</h1><p className="mt-1 text-sm text-slate-500">Manage clients and event organizers.</p></div><Button onClick={() => { setEditing(null); setFormOpen(true) }} className="w-fit bg-[#1648b8] text-white hover:bg-[#123b98]"><Plus />New Client</Button></header>
        {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
        {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="size-4" />{error}<Button variant="ghost" size="sm" className="ml-auto" onClick={() => void load()}><RefreshCw />Retry</Button></div>}
        <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(220px,1fr)_220px_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clients" className="pl-9" /></div><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={selectClass}><option value="">All client types</option>{clientTypes.map((type) => <option key={type}>{type}</option>)}</select><Button variant="ghost" onClick={() => { setSearch(""); setTypeFilter("") }}>Clear</Button></CardContent></Card>
        <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardHeader><CardTitle className="text-base">Clients <span className="ml-1 font-normal text-slate-400">({filtered.length})</span></CardTitle></CardHeader><CardContent>
          {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin text-blue-700" />Loading clients...</div> : filtered.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-blue-100 bg-blue-50/25 text-center"><UserRound className="size-6 text-blue-700" /><p className="mt-3 text-sm font-medium">No clients found</p></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map((client) => <article key={client.client_id} className="rounded-xl border border-blue-100 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-medium text-slate-900">{client.full_name}</h2><p className="mt-1 truncate text-xs text-slate-500">{client.organization_name || "Independent organizer"}</p></div><Badge variant="outline" className={clientTypeTone[client.client_type]}>{client.client_type}</Badge></div><div className="mt-4 space-y-2 text-xs text-slate-600">{client.email && <p className="flex items-center gap-2"><Mail className="size-3.5 text-slate-400" />{client.email}</p>}{client.phone && <p className="flex items-center gap-2"><Phone className="size-3.5 text-slate-400" />{client.phone}</p>}{client.address_line && <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" /><span className="line-clamp-2">{client.address_line}</span></p>}{client.tax_id && <p className="flex items-center gap-2"><Building2 className="size-3.5 text-slate-400" />Tax ID: {client.tax_id}</p>}</div>{client.notes && <p className="mt-3 line-clamp-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500">{client.notes}</p>}<div className="mt-4 flex items-center justify-between border-t border-blue-50 pt-3"><span className="text-xs text-emerald-600">{client.is_active ? "Active" : "Inactive"}</span><Button size="sm" variant="ghost" onClick={() => { setEditing(client); setFormOpen(true) }} className="text-blue-700 hover:bg-blue-50"><Pencil />Edit</Button></div></article>)}</div>}
        </CardContent></Card>
      </div>
      <ClientForm open={formOpen} client={editing} onOpenChange={setFormOpen} onSaved={(wasEditing) => { setFormOpen(false); setNotice(wasEditing ? "Client updated successfully." : "Client created successfully."); void load() }} />
    </ConferaPageShell>
  )
}
