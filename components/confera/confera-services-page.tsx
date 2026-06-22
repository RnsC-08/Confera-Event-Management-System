"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Boxes, HandPlatter, Layers3, Loader2, Pencil, Plus, RefreshCw, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConferaEventServiceForm } from "@/components/confera/confera-event-service-form"
import { ConferaAccessNotice } from "@/components/confera/confera-access-notice"
import { ConferaPageShell } from "@/components/confera/confera-page-shell"
import { ConferaServicePackageForm } from "@/components/confera/confera-service-package-form"
import type { EventService, PricingModel, ServicePackage } from "@/components/confera/confera-service-types"
import { pricingModels } from "@/components/confera/confera-service-types"
import { useAuth } from "@/lib/auth-context"
import { canWriteConferaResource } from "@/lib/confera-permissions"

class ServiceApiError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

async function serviceRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ServiceApiError(
      response.status === 500
        ? "The system could not process the service request. Please try again."
        : json?.error || `Request failed (${response.status})`,
      response.status,
    )
  }
  return json as T
}

const selectClass = "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
const pricingTone: Record<PricingModel, string> = {
  Flat: "border-slate-200 bg-slate-50 text-slate-700",
  PerUnit: "border-blue-200 bg-blue-50 text-blue-700",
  PerGuest: "border-cyan-200 bg-cyan-50 text-cyan-700",
  PerHour: "border-indigo-200 bg-indigo-50 text-indigo-700",
}

function ActiveBadge({ active }: { active: number }) {
  return <Badge variant="outline" className={active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}>{active ? "Active" : "Inactive"}</Badge>
}

export function ConferaServicesPage() {
  const { user } = useAuth()
  const canManage = Boolean(user && canWriteConferaResource(user.role_name, "services"))
  const [services, setServices] = useState<EventService[]>([])
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [serviceSearch, setServiceSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [pricingFilter, setPricingFilter] = useState("")
  const [packageSearch, setPackageSearch] = useState("")
  const [serviceFormOpen, setServiceFormOpen] = useState(false)
  const [packageFormOpen, setPackageFormOpen] = useState(false)
  const [editingService, setEditingService] = useState<EventService | null>(null)
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const [nextServices, nextPackages] = await Promise.all([
        serviceRequest<EventService[]>("/api/confera/event-services"),
        serviceRequest<ServicePackage[]>("/api/confera/service-packages"),
      ])
      setServices(nextServices)
      setPackages(nextPackages)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load services.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const categories = Array.from(new Set(services.map((service) => service.category))).sort()
  const normalizedServiceSearch = serviceSearch.trim().toLowerCase()
  const filteredServices = services.filter((service) => {
    const matchesSearch = !normalizedServiceSearch || service.name.toLowerCase().includes(normalizedServiceSearch)
    return matchesSearch && (!categoryFilter || service.category === categoryFilter) && (!pricingFilter || service.pricing_model === pricingFilter)
  })
  const normalizedPackageSearch = packageSearch.trim().toLowerCase()
  const filteredPackages = packages.filter((item) => !normalizedPackageSearch || item.name.toLowerCase().includes(normalizedPackageSearch) || item.description?.toLowerCase().includes(normalizedPackageSearch))

  async function saveService(payload: Record<string, unknown>, editing: boolean) {
    await serviceRequest<EventService>("/api/confera/event-services", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    setServiceFormOpen(false)
    setNotice(editing ? "Event service updated successfully." : "Event service created successfully.")
    setError(null)
    await load()
  }

  async function savePackage(payload: Record<string, unknown>, editing: boolean) {
    await serviceRequest<ServicePackage>("/api/confera/service-packages", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    setPackageFormOpen(false)
    setNotice(editing ? "Service package updated successfully." : "Service package created successfully.")
    setError(null)
    await load()
  }

  return (
    <ConferaPageShell activeItem="services">
      <div className={`space-y-6 ${!canManage ? "[&_button:has(.lucide-pencil)]:hidden [&_button:has(.lucide-plus)]:hidden" : ""}`}>
        <header className="border-b border-blue-100 pb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Services</h1>
          <p className="mt-1 text-sm text-slate-500">Manage event services, pricing models, and service packages.</p>
        </header>

        {!canManage && <ConferaAccessNotice />}
        {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
        {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="size-4 shrink-0" />{error}<Button variant="ghost" size="sm" className="ml-auto text-rose-700" onClick={() => void load()}><RefreshCw />Retry</Button></div>}

        <Tabs defaultValue="event-services" className="gap-5">
          <TabsList className="h-11 border border-blue-100 bg-blue-50/70 p-1">
            <TabsTrigger value="event-services" className="px-4 data-[state=active]:text-blue-700"><HandPlatter />Event Services</TabsTrigger>
            <TabsTrigger value="packages" className="px-4 data-[state=active]:text-blue-700"><Layers3 />Service Packages</TabsTrigger>
          </TabsList>

          <TabsContent value="event-services" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-900">Event Services</h2><p className="text-sm text-slate-500">Individual services available for event bookings.</p></div><Button onClick={() => { setEditingService(null); setServiceFormOpen(true) }} className="w-fit bg-[#1648b8] text-white hover:bg-[#123b98]"><Plus />New Service</Button></div>
            <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_220px_180px_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="Search services" className="pl-9" /></div><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={selectClass}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><select value={pricingFilter} onChange={(event) => setPricingFilter(event.target.value)} className={selectClass}><option value="">All pricing models</option>{pricingModels.map((model) => <option key={model}>{model}</option>)}</select><Button variant="ghost" onClick={() => { setServiceSearch(""); setCategoryFilter(""); setPricingFilter("") }}>Clear</Button></CardContent></Card>
            <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardHeader><CardTitle className="text-base">Services <span className="font-normal text-slate-400">({filteredServices.length})</span></CardTitle></CardHeader><CardContent>
              {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin text-blue-700" />Loading event services...</div> : filteredServices.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-blue-100 bg-blue-50/25"><HandPlatter className="size-6 text-blue-700" /><p className="mt-3 text-sm font-medium">No event services found</p></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredServices.map((service) => <article key={service.event_service_id} className="rounded-xl border border-blue-100 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium text-slate-900">{service.name}</h3><Badge variant="outline" className="mt-2 border-cyan-200 bg-cyan-50 text-cyan-700">{service.category}</Badge></div><ActiveBadge active={service.is_active} /></div><p className="mt-4 text-2xl font-semibold text-slate-900">EUR {Number(service.unit_price).toFixed(2)}</p><div className="mt-2 flex items-center gap-2"><Badge variant="outline" className={pricingTone[service.pricing_model]}>{service.pricing_model}</Badge>{service.unit_label && <span className="text-xs text-slate-500">per {service.unit_label}</span>}</div><p className="mt-3 min-h-10 line-clamp-2 text-xs leading-5 text-slate-500">{service.description || "No description"}</p><div className="mt-4 flex justify-end border-t border-blue-50 pt-3"><Button size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-50" onClick={() => { setEditingService(service); setServiceFormOpen(true) }}><Pencil />Edit</Button></div></article>)}</div>}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-900">Service Packages</h2><p className="text-sm text-slate-500">Bundled service offerings and included items.</p></div><Button onClick={() => { setEditingPackage(null); setPackageFormOpen(true) }} className="w-fit bg-[#1648b8] text-white hover:bg-[#123b98]"><Plus />New Package</Button></div>
            <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardContent className="flex gap-3 p-4"><div className="relative max-w-lg flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={packageSearch} onChange={(event) => setPackageSearch(event.target.value)} placeholder="Search packages" className="pl-9" /></div><Button variant="ghost" onClick={() => setPackageSearch("")}>Clear</Button></CardContent></Card>
            <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardHeader><CardTitle className="text-base">Packages <span className="font-normal text-slate-400">({filteredPackages.length})</span></CardTitle></CardHeader><CardContent>
              {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin text-blue-700" />Loading service packages...</div> : filteredPackages.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-blue-100 bg-blue-50/25"><Boxes className="size-6 text-blue-700" /><p className="mt-3 text-sm font-medium">No service packages found</p></div> : <div className="grid gap-4 lg:grid-cols-2">{filteredPackages.map((item) => <article key={item.service_package_id} className="rounded-xl border border-blue-100 p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium text-slate-900">{item.name}</h3><p className="mt-1 text-2xl font-semibold text-slate-900">EUR {Number(item.price).toFixed(2)}</p></div><ActiveBadge active={item.is_active} /></div><p className="mt-3 text-sm leading-6 text-slate-500">{item.description || "No package description"}</p><div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/30 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Included services ({item.items.length})</p>{item.items.length === 0 ? <p className="mt-2 text-xs text-slate-400">No services included.</p> : <div className="mt-2 space-y-2">{item.items.map((packageItem) => <div key={packageItem.service_package_item_id} className="rounded-md border border-blue-100 bg-white px-3 py-2"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-slate-700">{packageItem.event_service_name}</span><span className="text-xs text-blue-700">Qty {Number(packageItem.default_quantity)}</span></div><p className="mt-1 text-xs text-slate-400">{packageItem.category}{packageItem.notes ? ` - ${packageItem.notes}` : ""}</p></div>)}</div>}</div><div className="mt-4 flex justify-end border-t border-blue-50 pt-3"><Button size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-50" onClick={() => { setEditingPackage(item); setPackageFormOpen(true) }}><Pencil />Edit Header</Button></div></article>)}</div>}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {canManage && <ConferaEventServiceForm open={serviceFormOpen} service={editingService} onOpenChange={setServiceFormOpen} onSubmit={saveService} />}
      {canManage && <ConferaServicePackageForm open={packageFormOpen} servicePackage={editingPackage} onOpenChange={setPackageFormOpen} onSubmit={savePackage} />}
    </ConferaPageShell>
  )
}
