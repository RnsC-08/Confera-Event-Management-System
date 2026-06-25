"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Boxes, CircleDollarSign, Loader2, PackageCheck, Pencil, Plus, RefreshCw, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ConferaEquipmentForm } from "@/components/confera/confera-equipment-form"
import { ConferaAccessNotice } from "@/components/confera/confera-access-notice"
import type { Equipment } from "@/components/confera/confera-equipment-types"
import { equipmentStatuses } from "@/components/confera/confera-equipment-types"
import { ConferaPageShell } from "@/components/confera/confera-page-shell"
import { ConferaStatusBadge } from "@/components/confera/confera-status-badge"
import { useAuth } from "@/lib/auth-context"
import { canPerformConferaAction, canViewFinancialData } from "@/lib/confera-permissions"

class EquipmentApiError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

async function equipmentRequest<T>(init?: RequestInit) {
  const response = await fetch("/api/confera/equipment", { cache: "no-store", ...init })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new EquipmentApiError(
      response.status === 500
        ? "The system could not process the equipment request. Please try again."
        : json?.error || `Request failed (${response.status})`,
      response.status,
    )
  }
  return json as T
}

const selectClass = "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"

export function ConferaEquipmentPage() {
  const { user } = useAuth()
  const canCreate = Boolean(user && canPerformConferaAction(user.role_name, "equipment:create"))
  const canUpdate = Boolean(user && canPerformConferaAction(user.role_name, "equipment:update"))
  const showFinancialData = Boolean(user && canViewFinancialData(user.role_name))
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Equipment | null>(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      setEquipment(await equipmentRequest<Equipment[]>())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load equipment.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const categories = Array.from(new Set(equipment.map((item) => item.category))).sort()
  const term = search.trim().toLowerCase()
  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch = !term || item.name.toLowerCase().includes(term)
    return matchesSearch && (!categoryFilter || item.category === categoryFilter) && (!statusFilter || item.status === statusFilter)
  })

  async function saveEquipment(payload: Record<string, unknown>, editingRecord: boolean) {
    await equipmentRequest<Equipment>({
      method: editingRecord ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setFormOpen(false)
    setNotice(editingRecord ? "Equipment updated successfully." : "Equipment created successfully.")
    setError(null)
    await load()
  }

  function clearFilters() {
    setSearch("")
    setCategoryFilter("")
    setStatusFilter("")
  }

  return (
    <ConferaPageShell activeItem="equipment">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 border-b border-blue-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Equipment</h1><p className="mt-1 text-sm text-slate-500">Manage event equipment, quantities, availability and maintenance status.</p></div>
          {canCreate && <Button onClick={() => { setEditing(null); setFormOpen(true) }} className="w-fit bg-[#1648b8] text-white hover:bg-[#123b98]"><Plus />New Equipment</Button>}
        </header>

        {!canCreate && !canUpdate && <ConferaAccessNotice />}
        {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
        {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="size-4 shrink-0" />{error}<Button variant="ghost" size="sm" className="ml-auto text-rose-700" onClick={() => void load()}><RefreshCw />Retry</Button></div>}

        <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_220px_180px_auto]">
            <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search equipment" className="pl-9" /></div>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={selectClass} aria-label="Filter by category"><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={selectClass} aria-label="Filter by status"><option value="">All statuses</option>{equipmentStatuses.map((status) => <option key={status}>{status}</option>)}</select>
            <Button variant="ghost" onClick={clearFilters}>Clear</Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]">
          <CardHeader><CardTitle className="text-base">Equipment <span className="font-normal text-slate-400">({filteredEquipment.length})</span></CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin text-blue-700" />Loading equipment...</div>
            ) : filteredEquipment.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-blue-100 bg-blue-50/25 text-center"><Boxes className="size-6 text-blue-700" /><p className="mt-3 text-sm font-medium">No equipment found</p><p className="mt-1 text-sm text-slate-500">Create equipment or adjust the current filters.</p></div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredEquipment.map((item) => {
                  const availability = item.quantity_total > 0 ? Math.min(100, (item.quantity_available / item.quantity_total) * 100) : 0
                  return (
                    <article key={item.equipment_id} className="rounded-xl border border-blue-100 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-medium text-slate-900">{item.name}</h2><Badge variant="outline" className="mt-2 border-cyan-200 bg-cyan-50 text-cyan-700">{item.category}</Badge></div><ConferaStatusBadge value={item.status} /></div>

                      <div className={showFinancialData ? "mt-5 grid grid-cols-2 gap-3 text-sm" : "mt-5 grid gap-3 text-sm"}>
                        <div className="rounded-lg bg-slate-50 p-3"><p className="flex items-center gap-1.5 text-xs text-slate-400"><PackageCheck className="size-3.5" />Available</p><p className="mt-1 text-lg font-semibold text-slate-900">{item.quantity_available} <span className="text-xs font-normal text-slate-400">/ {item.quantity_total}</span></p></div>
                        {showFinancialData && <div className="rounded-lg bg-slate-50 p-3"><p className="flex items-center gap-1.5 text-xs text-slate-400"><CircleDollarSign className="size-3.5" />Unit cost</p><p className="mt-1 text-lg font-semibold text-slate-900">EUR {Number(item.unit_cost).toFixed(2)}</p></div>}
                      </div>

                      <div className="mt-3"><div className="flex justify-between text-xs text-slate-400"><span>Availability</span><span>{Math.round(availability)}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2864d7] transition-[width]" style={{ width: `${availability}%` }} /></div></div>
                      <p className="mt-3 min-h-10 line-clamp-2 text-xs leading-5 text-slate-500">{item.notes || "No equipment notes"}</p>

                      <div className="mt-4 flex items-center justify-between border-t border-blue-50 pt-3"><span className={item.is_active ? "text-xs text-emerald-600" : "text-xs text-slate-400"}>{item.is_active ? "Active" : "Inactive"}</span>{canUpdate && <Button size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-50" onClick={() => { setEditing(item); setFormOpen(true) }}><Pencil />Edit</Button>}</div>
                    </article>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(canCreate || canUpdate) && <ConferaEquipmentForm open={formOpen} equipment={editing} showFinancialData={showFinancialData} onOpenChange={setFormOpen} onSubmit={saveEquipment} />}
    </ConferaPageShell>
  )
}
