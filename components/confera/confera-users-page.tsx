"use client"

import { useEffect, useState } from "react"
import { AlertCircle, KeyRound, Loader2, Mail, Pencil, Plus, RefreshCw, Search, ShieldCheck, UserCog } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ConferaPageShell } from "@/components/confera/confera-page-shell"
import { ConferaUserForm } from "@/components/confera/confera-user-form"
import type { ManagedRole, ManagedUser } from "@/components/confera/confera-user-form"

type FormMode = "create" | "edit" | "reset"

async function userRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(response.status === 500 ? "The system could not process the user request." : json?.error || `Request failed (${response.status})`)
  return json as T
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

export function ConferaUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [roles, setRoles] = useState<ManagedRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [mode, setMode] = useState<FormMode>("create")
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const [nextUsers, nextRoles] = await Promise.all([
        userRequest<ManagedUser[]>("/api/confera/users"),
        userRequest<ManagedRole[]>("/api/confera/roles"),
      ])
      setUsers(nextUsers)
      setRoles(nextRoles)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load users.")
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])
  const term = search.trim().toLowerCase()
  const filtered = users.filter((user) => !term || user.full_name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term) || user.role_name.toLowerCase().includes(term))

  function openForm(nextMode: FormMode, user: ManagedUser | null = null) {
    setMode(nextMode)
    setSelectedUser(user)
    setFormOpen(true)
  }

  async function saveUser(payload: Record<string, unknown>, submittedMode: FormMode) {
    await userRequest<ManagedUser>("/api/confera/users", {
      method: submittedMode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setFormOpen(false)
    setNotice(submittedMode === "create" ? "User created successfully." : submittedMode === "edit" ? "User updated successfully." : "Password reset successfully.")
    await load()
  }

  return <ConferaPageShell activeItem="users"><div className="space-y-6"><header className="flex flex-col gap-4 border-b border-blue-100 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-semibold text-slate-950">Users</h1><p className="mt-1 text-sm text-slate-500">Manage Confera users, roles, status, and passwords.</p></div><Button onClick={() => openForm("create")} className="w-fit bg-[#1648b8] text-white hover:bg-[#123b98]"><Plus />New User</Button></header>{notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}{error && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="size-4" />{error}<Button variant="ghost" size="sm" className="ml-auto" onClick={() => void load()}><RefreshCw />Retry</Button></div>}<Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-blue-700" />Role Access Overview</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3"><p className="text-sm font-semibold text-slate-900">Administrator</p><p className="mt-1 text-xs leading-5 text-slate-600">Full access to all modules and user management.</p></div><div className="rounded-lg border border-cyan-100 bg-cyan-50/40 p-3"><p className="text-sm font-semibold text-slate-900">Event Coordinator</p><p className="mt-1 text-xs leading-5 text-slate-600">Manages bookings, clients, invoices/payments, and staff assignments; views halls, services, equipment, and reports.</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-900">Operational Staff</p><p className="mt-1 text-xs leading-5 text-slate-600">Works with equipment and staff tasks, views bookings/halls, and updates operational progress.</p></div></CardContent></Card><Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardContent className="p-4"><div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" className="pl-9" /></div></CardContent></Card><Card className="rounded-xl border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]"><CardHeader><CardTitle className="text-base">Users <span className="font-normal text-slate-400">({filtered.length})</span></CardTitle></CardHeader><CardContent>{loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin text-blue-700" />Loading users...</div> : filtered.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center"><UserCog className="size-7 text-blue-700" /><p className="mt-3 text-sm">No users found</p></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map((user) => <article key={user.user_id} className="rounded-xl border border-blue-100 p-4 shadow-sm"><div className="flex items-start justify-between gap-2"><div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><UserCog className="size-5" /></div><div className="flex flex-wrap justify-end gap-1.5"><Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700"><ShieldCheck className="mr-1 size-3" />{user.role_name}</Badge><Badge variant="outline" className={user.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}>{user.is_active ? "Active" : "Inactive"}</Badge></div></div><h2 className="mt-4 font-medium text-slate-900">{user.full_name}</h2><p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Mail className="size-4" />{user.email}</p><p className="mt-2 text-xs text-slate-400">Created {formatDate(user.created_at)}</p><div className="mt-4 flex flex-wrap justify-end gap-1 border-t border-blue-50 pt-3"><Button size="sm" variant="ghost" className="text-slate-600 hover:bg-blue-50" onClick={() => openForm("reset", user)}><KeyRound />Reset Password</Button><Button size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-50" onClick={() => openForm("edit", user)}><Pencil />Edit</Button></div></article>)}</div>}</CardContent></Card></div><ConferaUserForm open={formOpen} mode={mode} user={selectedUser} roles={roles} onOpenChange={setFormOpen} onSubmit={saveUser} /></ConferaPageShell>
}
