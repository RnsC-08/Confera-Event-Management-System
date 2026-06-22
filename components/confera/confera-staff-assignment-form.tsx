"use client"

import { FormEvent, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ActiveStaffUser, StaffAssignment, StaffBooking } from "@/components/confera/confera-staff-types"
import { assignmentStatuses } from "@/components/confera/confera-staff-types"

const inputClass = "border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-100"
const selectClass = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"

export function ConferaStaffAssignmentForm({
  open,
  assignment,
  bookings,
  users,
  limitedEdit = false,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  assignment: StaffAssignment | null
  bookings: StaffBooking[]
  users: ActiveStaffUser[]
  limitedEdit?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: Record<string, unknown>, editing: boolean) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const assignmentRole = limitedEdit && assignment ? assignment.assignment_role : String(form.get("assignment_role") ?? "").trim()
    if (!assignmentRole) return setError("Assignment role is required.")

    const payload = {
      ...(assignment
        ? { staff_assignment_id: assignment.staff_assignment_id }
        : {
            event_booking_id: Number(form.get("event_booking_id")),
            user_id: Number(form.get("user_id")),
          }),
      ...(!limitedEdit ? {
        assignment_role: assignmentRole,
        task_description: String(form.get("task_description") ?? "").trim() || null,
      } : {}),
      assignment_status: String(form.get("assignment_status")),
      notes: String(form.get("notes") ?? "").trim() || null,
    }

    try {
      setSaving(true)
      await onSubmit(payload, Boolean(assignment))
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save the staff assignment.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setError(null); onOpenChange(next) }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-blue-100 sm:max-w-2xl">
        <DialogHeader><DialogTitle>{limitedEdit ? "Update Task Progress" : assignment ? "Edit Staff Assignment" : "New Staff Assignment"}</DialogTitle><DialogDescription>{limitedEdit ? "Update the operational status and notes for this task." : "Assign an active staff user to an event and track the task status."}</DialogDescription></DialogHeader>
        <form key={assignment?.staff_assignment_id ?? "new"} onSubmit={handleSubmit} className="space-y-5">
          {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            {!assignment && <>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="assignment-booking">Event booking <span className="text-rose-600">*</span></Label><select id="assignment-booking" name="event_booking_id" defaultValue="" required className={selectClass}><option value="" disabled>Select a booking</option>{bookings.map((booking) => <option key={booking.event_booking_id} value={booking.event_booking_id}>{booking.booking_reference} - {booking.event_title} - {booking.client_name} - {booking.event_date.slice(0, 10)}</option>)}</select></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="assignment-user">Staff member <span className="text-rose-600">*</span></Label><select id="assignment-user" name="user_id" defaultValue="" required className={selectClass}><option value="" disabled>Select active staff</option>{users.map((user) => <option key={user.user_id} value={user.user_id}>{user.full_name} - {user.role_name}{user.email ? ` - ${user.email}` : ""}</option>)}</select></div>
            </>}
            {assignment && <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 sm:col-span-2"><p className="text-sm font-medium">{assignment.staff_name} - {assignment.event_title || assignment.booking_reference}</p><p className="mt-1 text-xs text-slate-500">{assignment.booking_reference} - {assignment.role_name}</p></div>}
            {!limitedEdit && <div className="space-y-2"><Label htmlFor="assignment-role">Assignment role <span className="text-rose-600">*</span></Label><Input id="assignment-role" name="assignment_role" defaultValue={assignment?.assignment_role ?? ""} required placeholder="Setup, AV, Coordinator Support..." className={inputClass} /></div>}
            <div className="space-y-2"><Label htmlFor="assignment-status">Status <span className="text-rose-600">*</span></Label><select id="assignment-status" name="assignment_status" defaultValue={assignment?.assignment_status ?? "Assigned"} required className={selectClass}>{assignmentStatuses.map((status) => <option key={status}>{status}</option>)}</select></div>
            {!limitedEdit && <div className="space-y-2 sm:col-span-2"><Label htmlFor="task-description">Task description</Label><Textarea id="task-description" name="task_description" defaultValue={assignment?.task_description ?? ""} rows={3} className={inputClass} /></div>}
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="assignment-notes">Notes</Label><Textarea id="assignment-notes" name="notes" defaultValue={assignment?.notes ?? ""} rows={2} className={inputClass} /></div>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving || (!assignment && (bookings.length === 0 || users.length === 0))} className="bg-[#1648b8] text-white hover:bg-[#123b98]">{saving && <Loader2 className="animate-spin" />}{saving ? "Saving..." : assignment ? "Save Changes" : "Create Assignment"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
