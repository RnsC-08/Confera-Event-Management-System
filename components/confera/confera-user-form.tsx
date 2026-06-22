"use client"

import { FormEvent, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type ManagedUser = {
  user_id: number
  role_id: number
  full_name: string
  email: string
  role_name: string
  is_active: number
  created_at: string
}

export type ManagedRole = {
  role_id: number
  name: string
  description: string | null
}

type UserFormMode = "create" | "edit" | "reset"
const inputClass = "border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-100"
const selectClass = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"

export function ConferaUserForm({
  open,
  mode,
  user,
  roles,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  mode: UserFormMode
  user: ManagedUser | null
  roles: ManagedRole[]
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: Record<string, unknown>, mode: UserFormMode) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    let payload: Record<string, unknown>

    if (mode === "reset") {
      const password = String(form.get("password") ?? "")
      const confirmation = String(form.get("confirm_password") ?? "")
      if (password.length < 8) return setError("Password must be at least 8 characters.")
      if (password !== confirmation) return setError("Passwords do not match.")
      payload = { user_id: user?.user_id, new_password: password }
    } else {
      const fullName = String(form.get("full_name") ?? "").trim()
      const email = String(form.get("email") ?? "").trim()
      if (!fullName) return setError("Full name is required.")
      if (!email) return setError("Email is required.")
      payload = {
        ...(mode === "edit" ? { user_id: user?.user_id } : {}),
        full_name: fullName,
        email,
        role_id: Number(form.get("role_id")),
        is_active: form.get("is_active") === "on",
      }
      if (mode === "create") {
        const password = String(form.get("password") ?? "")
        const confirmation = String(form.get("confirm_password") ?? "")
        if (password.length < 8) return setError("Password must be at least 8 characters.")
        if (password !== confirmation) return setError("Passwords do not match.")
        payload.password = password
      }
    }

    try {
      setSaving(true)
      await onSubmit(payload, mode)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save the user.")
    } finally { setSaving(false) }
  }

  const title = mode === "create" ? "New User" : mode === "edit" ? "Edit User" : "Reset Password"
  return <Dialog open={open} onOpenChange={(next) => { if (!next) setError(null); onOpenChange(next) }}><DialogContent className="border-blue-100 sm:max-w-xl"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{mode === "reset" ? `Set a new password for ${user?.full_name ?? "this user"}.` : "Manage the user's identity, role, and active status."}</DialogDescription></DialogHeader><form key={`${mode}-${user?.user_id ?? "new"}`} onSubmit={handleSubmit} className="space-y-5">{error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}{mode === "reset" ? <div className="space-y-4"><div className="space-y-2"><Label htmlFor="reset-password">New password</Label><Input id="reset-password" name="password" type="password" minLength={8} required className={inputClass} /></div><div className="space-y-2"><Label htmlFor="reset-confirm">Confirm password</Label><Input id="reset-confirm" name="confirm_password" type="password" minLength={8} required className={inputClass} /></div></div> : <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="user-full-name">Full name</Label><Input id="user-full-name" name="full_name" defaultValue={user?.full_name ?? ""} required className={inputClass} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="user-email">Email</Label><Input id="user-email" name="email" type="email" defaultValue={user?.email ?? ""} required className={inputClass} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="user-role">Role</Label><select id="user-role" name="role_id" defaultValue={user?.role_id ?? ""} required className={selectClass}><option value="" disabled>Select a role</option>{roles.map((role) => <option key={role.role_id} value={role.role_id}>{role.name}</option>)}</select></div>{mode === "create" && <><div className="space-y-2"><Label htmlFor="create-password">Password</Label><Input id="create-password" name="password" type="password" minLength={8} required className={inputClass} /></div><div className="space-y-2"><Label htmlFor="create-confirm">Confirm password</Label><Input id="create-confirm" name="confirm_password" type="password" minLength={8} required className={inputClass} /></div></>}<label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" name="is_active" defaultChecked={user ? Boolean(user.is_active) : true} className="size-4 accent-blue-700" /> Active user</label></div>}<DialogFooter className="border-t border-slate-100 pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving} className="bg-[#1648b8] text-white hover:bg-[#123b98]">{saving && <Loader2 className="animate-spin" />}{saving ? "Saving..." : mode === "reset" ? "Reset Password" : "Save User"}</Button></DialogFooter></form></DialogContent></Dialog>
}
