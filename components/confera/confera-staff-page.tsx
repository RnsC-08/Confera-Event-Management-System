"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CalendarDays, ClipboardCheck, Loader2, Pencil, Plus, RefreshCw, Search, UserRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ConferaPageShell } from "@/components/confera/confera-page-shell"
import { ConferaAccessNotice } from "@/components/confera/confera-access-notice"
import { ConferaStaffAssignmentForm } from "@/components/confera/confera-staff-assignment-form"
import type { ActiveStaffUser, StaffAssignment, StaffBooking } from "@/components/confera/confera-staff-types"
import { assignmentStatuses } from "@/components/confera/confera-staff-types"
import { ConferaStatusBadge } from "@/components/confera/confera-status-badge"
import { useAuth } from "@/lib/auth-context"
import { canPerformConferaAction } from "@/lib/confera-permissions"

class StaffApiError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

async function staffRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new StaffApiError(response.status === 500 ? "The system could not process the staff request. Please try again." : json?.error || `Request failed (${response.status})`, response.status)
  return json as T
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value))
}

const selectClass = "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"

export function ConferaStaffPage() {
  const { user } = useAuth()
  const canCreate = Boolean(user && canPerformConferaAction(user.role_name, "staff:create"))
  const canUpdate = Boolean(user && canPerformConferaAction(user.role_name, "staff:update"))
  const hasLimitedAccess = user?.role_name === "Operational Staff"
  const [assignments, setAssignments] = useState<StaffAssignment[]>([])
  const [bookings, setBookings] = useState<StaffBooking[]>([])
  const [users, setUsers] = useState<ActiveStaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StaffAssignment | null>(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const [nextAssignments, nextBookings, nextUsers] = await Promise.all([
        staffRequest<StaffAssignment[]>("/api/confera/staff-assignments"),
        staffRequest<StaffBooking[]>("/api/confera/event-bookings"),
        staffRequest<ActiveStaffUser[]>("/api/confera/users"),
      ])
      setAssignments(nextAssignments)
      setBookings(nextBookings)
      setUsers(nextUsers)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load staff assignments.")
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const roles = Array.from(new Set(assignments.map((assignment) => assignment.assignment_role))).sort()
  const term = search.trim().toLowerCase()
  const filtered = assignments.filter((assignment) => {
    const matchesSearch = !term || assignment.staff_name.toLowerCase().includes(term) || assignment.event_title?.toLowerCase().includes(term) || assignment.booking_reference.toLowerCase().includes(term)
    return matchesSearch && (!statusFilter || assignment.assignment_status === statusFilter) && (!roleFilter || assignment.assignment_role === roleFilter)
  })

  async function saveAssignment(payload: Record<string, unknown>, editingRecord: boolean) {
    try {
      await staffRequest<StaffAssignment>("/api/confera/staff-assignments", { method: editingRecord ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      setFormOpen(false)
      setNotice(editingRecord ? "Staff assignment updated successfully." : "Staff assignment created successfully.")
      setError(null)
      await load()
    } catch (requestError) {
      if (requestError instanceof StaffApiError && requestError.status === 409) throw new Error("This staff member is already assigned to this event with the same role.")
      throw requestError
    }
  }

  return (
    <ConferaPageShell activeItem="staff">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 border-b border-blue-100 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Staff Assignments</h1><p className="mt-1 text-sm text-slate-500">Assign operational staff to events and track task progress.</p></div>{canCreate && <Button onClick={() => { setEditing(null); setFormOpen(true) }} className="w-fit bg-[#1648b8] text-white hover:bg-[#123b98]"><Plus />New Assignment</Button>}</header>

        {hasLimitedAccess && <ConferaAccessNotice limited />}
        {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
        {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="size-4 shrink-0" />{error}<Button variant="ghost" size="sm" className="ml-auto" onClick={() => void load()}><RefreshCw />Retry</Button></div>}

        <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_190px_220px_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff or events" className="pl-9" /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={selectClass}><option value="">All statuses</option>{assignmentStatuses.map((status) => <option key={status}>{status}</option>)}</select><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className={selectClass}><option value="">All assignment roles</option>{roles.map((role) => <option key={role}>{role}</option>)}</select><Button variant="ghost" onClick={() => { setSearch(""); setStatusFilter(""); setRoleFilter("") }}>Clear</Button></CardContent></Card>

        <Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardHeader><CardTitle className="text-base">Assignments <span className="font-normal text-slate-400">({filtered.length})</span></CardTitle></CardHeader><CardContent>
          {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin text-blue-700" />Loading staff assignments...</div> : filtered.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-blue-100 bg-blue-50/25"><ClipboardCheck className="size-6 text-blue-700" /><p className="mt-3 text-sm font-medium">No staff assignments found</p></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map((assignment) => <article key={assignment.staff_assignment_id} className="rounded-xl border border-blue-100 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-medium text-slate-900">{assignment.event_title || "Untitled event"}</h2><p className="mt-1 text-xs text-slate-500">{assignment.booking_reference}</p></div><ConferaStatusBadge value={assignment.assignment_status} /></div><div className="mt-4 space-y-2"><p className="flex items-center gap-2 text-sm text-slate-700"><UserRound className="size-4 text-blue-600" /><span className="font-medium">{assignment.staff_name}</span></p><p className="text-xs text-slate-500">{assignment.role_name} - <Badge variant="outline" className="ml-1 border-cyan-200 bg-cyan-50 text-cyan-700">{assignment.assignment_role}</Badge></p></div><p className="mt-3 min-h-10 line-clamp-2 text-xs leading-5 text-slate-500">{assignment.task_description || "No task description"}</p>{assignment.notes && <p className="mt-2 line-clamp-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500">{assignment.notes}</p>}<div className="mt-4 space-y-1 border-t border-blue-50 pt-3 text-xs text-slate-400"><p className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />Assigned {formatDateTime(assignment.assigned_at)}</p>{assignment.completed_at && <p>Completed {formatDateTime(assignment.completed_at)}</p>}</div>{canUpdate && <div className="mt-3 flex justify-end"><Button size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-50" onClick={() => { setEditing(assignment); setFormOpen(true) }}><Pencil />{hasLimitedAccess ? "Update Progress" : "Edit"}</Button></div>}</article>)}</div>}
        </CardContent></Card>
      </div>

      {canUpdate && <ConferaStaffAssignmentForm open={formOpen} assignment={editing} bookings={bookings} users={users} limitedEdit={hasLimitedAccess} onOpenChange={setFormOpen} onSubmit={saveAssignment} />}
    </ConferaPageShell>
  )
}
