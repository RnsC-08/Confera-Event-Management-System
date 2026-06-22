"use client"

import { FormEvent, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type {
  BookingClient,
  BookingHall,
  BookingPackage,
  CreateBookingPayload,
} from "@/components/confera/confera-booking-types"

const fieldClass =
  "border-slate-200 bg-white focus-visible:border-blue-400 focus-visible:ring-blue-100"
const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-xs outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"

export function ConferaBookingForm({
  open,
  onOpenChange,
  clients,
  halls,
  packages,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: BookingClient[]
  halls: BookingHall[]
  packages: BookingPackage[]
  onSubmit: (payload: CreateBookingPayload) => Promise<void>
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const startTime = String(form.get("start_time") ?? "")
    const endTime = String(form.get("end_time") ?? "")
    const participantCount = Number(form.get("participant_count"))
    const discountAmount = Number(form.get("discount_amount"))

    if (endTime <= startTime) {
      setError("End time must be after start time.")
      return
    }
    if (!Number.isFinite(participantCount) || participantCount < 0) {
      setError("Participant count must be 0 or greater.")
      return
    }
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      setError("Discount amount must be 0 or greater.")
      return
    }

    const packageValue = String(form.get("service_package_id") ?? "")
    const payload: CreateBookingPayload = {
      client_id: Number(form.get("client_id")),
      event_hall_id: Number(form.get("event_hall_id")),
      event_date: String(form.get("event_date")),
      start_time: startTime,
      end_time: endTime,
      event_title: String(form.get("event_title")).trim(),
      event_type: String(form.get("event_type")).trim(),
      participant_count: participantCount,
      service_package_id: packageValue ? Number(packageValue) : null,
      booking_status: String(form.get("booking_status")) as "Draft" | "Confirmed",
      description: String(form.get("description") ?? "").trim() || null,
      notes: String(form.get("notes") ?? "").trim() || null,
      discount_amount: discountAmount,
    }

    try {
      setSubmitting(true)
      await onSubmit(payload)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create booking.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setError(null)
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto border-blue-100 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New Event Booking</DialogTitle>
          <DialogDescription>Create the event, schedule its hall, and optionally select a package.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client <span className="text-rose-600">*</span></Label>
              <select id="client_id" name="client_id" className={selectClass} required defaultValue="">
                <option value="" disabled>Select a client</option>
                {clients.map((client) => <option key={client.client_id} value={client.client_id}>{client.full_name}{client.organization_name ? ` - ${client.organization_name}` : ""}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_hall_id">Event hall <span className="text-rose-600">*</span></Label>
              <select id="event_hall_id" name="event_hall_id" className={selectClass} required defaultValue="">
                <option value="" disabled>Select a hall</option>
                {halls.map((hall) => <option key={hall.event_hall_id} value={hall.event_hall_id}>{hall.name}{hall.code ? ` (${hall.code})` : ""} - {hall.status}</option>)}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="event_title">Event title <span className="text-rose-600">*</span></Label>
              <Input id="event_title" name="event_title" className={fieldClass} required placeholder="Annual company conference" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_type">Event type <span className="text-rose-600">*</span></Label>
              <Input id="event_type" name="event_type" className={fieldClass} required placeholder="Conference, wedding, workshop..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="participant_count">Participants <span className="text-rose-600">*</span></Label>
              <Input id="participant_count" name="participant_count" className={fieldClass} type="number" min="0" step="1" defaultValue="0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_date">Event date <span className="text-rose-600">*</span></Label>
              <Input id="event_date" name="event_date" className={fieldClass} type="date" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label htmlFor="start_time">Start <span className="text-rose-600">*</span></Label><Input id="start_time" name="start_time" className={fieldClass} type="time" required /></div>
              <div className="space-y-2"><Label htmlFor="end_time">End <span className="text-rose-600">*</span></Label><Input id="end_time" name="end_time" className={fieldClass} type="time" required /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_package_id">Service package</Label>
              <select id="service_package_id" name="service_package_id" className={selectClass} defaultValue="">
                <option value="">No package</option>
                {packages.map((item) => <option key={item.service_package_id} value={item.service_package_id}>{item.name} - EUR {Number(item.price).toFixed(2)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking_status">Booking status <span className="text-rose-600">*</span></Label>
              <select id="booking_status" name="booking_status" className={selectClass} defaultValue="Draft" required>
                <option value="Draft">Draft</option><option value="Confirmed">Confirmed</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_amount">Discount amount</Label>
              <Input id="discount_amount" name="discount_amount" className={fieldClass} type="number" min="0" step="0.01" defaultValue="0" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" className={fieldClass} rows={2} placeholder="Optional event description" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" className={fieldClass} rows={2} placeholder="Optional operational notes" />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" className="bg-[#1648b8] text-white hover:bg-[#123b98]" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Creating..." : "Create Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
