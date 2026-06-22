"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Filter, Loader2, Plus, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ConferaBookingForm } from "@/components/confera/confera-booking-form"
import { ConferaBookingsTable } from "@/components/confera/confera-bookings-table"
import { ConferaAccessNotice } from "@/components/confera/confera-access-notice"
import { ConferaPageShell } from "@/components/confera/confera-page-shell"
import type {
  BookingClient,
  BookingHall,
  BookingPackage,
  BookingStatus,
  CreateBookingPayload,
  EventBooking,
} from "@/components/confera/confera-booking-types"
import { useAuth } from "@/lib/auth-context"
import { canWriteConferaResource } from "@/lib/confera-permissions"

class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiRequestError(json?.error || `Request failed (${response.status})`, response.status)
  }
  return json as T
}

const selectClass =
  "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"

export function ConferaBookingsPage() {
  const { user } = useAuth()
  const canManage = Boolean(user && canWriteConferaResource(user.role_name, "bookings"))
  const [bookings, setBookings] = useState<EventBooking[]>([])
  const [clients, setClients] = useState<BookingClient[]>([])
  const [halls, setHalls] = useState<BookingHall[]>([])
  const [packages, setPackages] = useState<BookingPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [hallFilter, setHallFilter] = useState("")
  const [clientFilter, setClientFilter] = useState("")

  async function loadBookings() {
    setBookings(await fetchJson<EventBooking[]>("/api/confera/event-bookings"))
  }

  async function loadPage() {
    try {
      setLoading(true)
      setError(null)
      if (!canManage) {
        const nextBookings = await fetchJson<EventBooking[]>("/api/confera/event-bookings")
        setBookings(nextBookings)
        setClients(Array.from(new Map(nextBookings.map((booking) => [booking.client_id, { client_id: booking.client_id, full_name: booking.client_name, organization_name: null }])).values()))
        setHalls(Array.from(new Map(nextBookings.map((booking) => [booking.event_hall_id, { event_hall_id: booking.event_hall_id, name: booking.hall_name, code: booking.hall_code, capacity: 0, status: "" }])).values()))
        setPackages([])
        return
      }
      const [nextBookings, nextClients, nextHalls, nextPackages] = await Promise.all([
        fetchJson<EventBooking[]>("/api/confera/event-bookings"),
        fetchJson<BookingClient[]>("/api/confera/clients"),
        fetchJson<BookingHall[]>("/api/confera/event-halls"),
        fetchJson<BookingPackage[]>("/api/confera/service-packages"),
      ])
      setBookings(nextBookings)
      setClients(nextClients)
      setHalls(nextHalls)
      setPackages(nextPackages)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load event bookings.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPage()
  }, [])

  const normalizedSearch = search.trim().toLowerCase()
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = !normalizedSearch || booking.event_title.toLowerCase().includes(normalizedSearch) || booking.booking_reference.toLowerCase().includes(normalizedSearch)
    const matchesStatus = !statusFilter || booking.booking_status === statusFilter
    const matchesDate = !dateFilter || booking.event_date.slice(0, 10) === dateFilter
    const matchesHall = !hallFilter || booking.event_hall_id === Number(hallFilter)
    const matchesClient = !clientFilter || booking.client_id === Number(clientFilter)
    return matchesSearch && matchesStatus && matchesDate && matchesHall && matchesClient
  })

  async function createBooking(payload: CreateBookingPayload) {
    try {
      await fetchJson<EventBooking>("/api/confera/event-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      await loadBookings()
      setFormOpen(false)
      setNotice("Event booking created successfully.")
      setError(null)
    } catch (createError) {
      if (
        createError instanceof ApiRequestError &&
        createError.status === 409 &&
        createError.message.toLowerCase().includes("already booked")
      ) {
        throw new Error("This hall is already booked for the selected time.")
      }
      throw createError
    }
  }

  async function updateStatus(booking: EventBooking, status: BookingStatus) {
    try {
      setUpdatingId(booking.event_booking_id)
      setError(null)
      setNotice(null)
      await fetchJson<EventBooking>("/api/confera/event-bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_booking_id: booking.event_booking_id, booking_status: status }),
      })
      await loadBookings()
      setNotice(`${booking.booking_reference} is now ${status.toLowerCase()}.`)
    } catch (updateError) {
      if (
        updateError instanceof ApiRequestError &&
        updateError.status === 409 &&
        updateError.message.toLowerCase().includes("already booked")
      ) {
        setError("This hall is already booked for the selected time.")
      } else {
        setError(updateError instanceof Error ? updateError.message : "Failed to update booking status.")
      }
    } finally {
      setUpdatingId(null)
    }
  }

  function clearFilters() {
    setSearch("")
    setStatusFilter("")
    setDateFilter("")
    setHallFilter("")
    setClientFilter("")
  }

  return (
    <ConferaPageShell activeItem="event-bookings">
          <div className="space-y-6">
            <header className="flex flex-col gap-4 border-b border-blue-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Event Bookings</h1><p className="mt-1 text-sm text-slate-500">Create, view and manage event bookings.</p></div>
              {canManage && <Button onClick={() => setFormOpen(true)} className="w-fit bg-[#1648b8] text-white shadow-sm hover:bg-[#123b98]"><Plus className="size-4" />New Booking</Button>}
            </header>

            {!canManage && <ConferaAccessNotice />}
            {notice && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="size-4" />{notice}</div>}
            {error && !loading && <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="size-4 shrink-0" />{error}<Button variant="ghost" size="sm" className="ml-auto text-rose-700 hover:bg-rose-100" onClick={() => void loadPage()}><RefreshCw />Retry</Button></div>}

            <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-slate-900"><Filter className="size-4 text-blue-700" />Filters</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(140px,0.8fr))_auto]">
                <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="border-slate-200 pl-9 focus-visible:border-blue-400 focus-visible:ring-blue-100" placeholder="Search event or reference" aria-label="Search bookings" /></div>
                <select className={selectClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="">All statuses</option><option value="Draft">Draft</option><option value="Confirmed">Confirmed</option><option value="Cancelled">Cancelled</option><option value="Completed">Completed</option></select>
                <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-100" aria-label="Filter by event date" />
                <select className={selectClass} value={hallFilter} onChange={(event) => setHallFilter(event.target.value)} aria-label="Filter by hall"><option value="">All halls</option>{halls.map((hall) => <option key={hall.event_hall_id} value={hall.event_hall_id}>{hall.name}</option>)}</select>
                <select className={selectClass} value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} aria-label="Filter by client"><option value="">All clients</option>{clients.map((client) => <option key={client.client_id} value={client.client_id}>{client.full_name}</option>)}</select>
                <Button variant="ghost" onClick={clearFilters} className="text-slate-500 hover:bg-blue-50 hover:text-blue-700">Clear</Button>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]">
              <CardHeader className="flex-row items-center justify-between pb-3"><div><CardTitle className="text-base text-slate-900">Bookings</CardTitle><p className="mt-1 text-sm text-slate-500">Showing {filteredBookings.length} of {bookings.length} bookings</p></div></CardHeader>
              <CardContent>
                {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="size-5 animate-spin text-blue-700" />Loading event bookings...</div> : <ConferaBookingsTable bookings={filteredBookings} updatingId={updatingId} onStatusChange={(booking, status) => void updateStatus(booking, status)} readOnly={!canManage} />}
              </CardContent>
            </Card>
          </div>
      {canManage && <ConferaBookingForm open={formOpen} onOpenChange={setFormOpen} clients={clients} halls={halls} packages={packages} onSubmit={createBooking} />}
    </ConferaPageShell>
  )
}
