"use client"

import { CalendarDays, Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConferaStatusBadge } from "@/components/confera/confera-status-badge"
import type { BookingStatus, EventBooking } from "@/components/confera/confera-booking-types"

function datePart(value: string) {
  return value.slice(0, 10)
}

function formatDate(value: string) {
  const [year, month, day] = datePart(value).split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day))
}

function formatTime(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  const date = new Date(2000, 0, 1, hour, minute)
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date)
}

function BookingActions({
  booking,
  updating,
  onStatusChange,
  readOnly = false,
}: {
  booking: EventBooking
  updating: boolean
  onStatusChange: (booking: EventBooking, status: BookingStatus) => void
  readOnly?: boolean
}) {
  if (readOnly) return <span className="text-xs text-slate-400">View only</span>
  if (booking.booking_status === "Cancelled" || booking.booking_status === "Completed") {
    return <span className="text-xs text-slate-400">No actions</span>
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {booking.booking_status === "Draft" && (
        <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" disabled={updating} onClick={() => onStatusChange(booking, "Confirmed")}>
          {updating ? <Loader2 className="animate-spin" /> : <Check />} Confirm
        </Button>
      )}
      {booking.booking_status === "Confirmed" && (
        <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" disabled={updating} onClick={() => onStatusChange(booking, "Completed")}>
          {updating ? <Loader2 className="animate-spin" /> : <Check />} Complete
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={updating} onClick={() => onStatusChange(booking, "Cancelled")}>
        <X /> Cancel
      </Button>
    </div>
  )
}

export function ConferaBookingsTable({
  bookings,
  updatingId,
  onStatusChange,
  readOnly = false,
}: {
  bookings: EventBooking[]
  updatingId: number | null
  onStatusChange: (booking: EventBooking, status: BookingStatus) => void
  readOnly?: boolean
}) {
  if (bookings.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-blue-100 bg-blue-50/25 px-6 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100"><CalendarDays className="size-5" /></div>
        <p className="mt-4 text-sm font-medium text-slate-800">No event bookings found</p>
        <p className="mt-1 text-sm text-slate-500">Create a booking or adjust the current filters.</p>
      </div>
    )
  }

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <Table>
          <TableHeader>
            <TableRow className="border-blue-100 hover:bg-transparent">
              <TableHead>Reference / Event</TableHead><TableHead>Client</TableHead><TableHead>Hall</TableHead><TableHead>Date & Time</TableHead><TableHead>Package</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.event_booking_id} className="border-blue-50 transition-colors hover:bg-blue-50/40">
                <TableCell><p className="font-medium text-slate-900">{booking.event_title}</p><p className="mt-1 text-xs text-slate-500">{booking.booking_reference} - {booking.event_type}</p></TableCell>
                <TableCell>{booking.client_name}</TableCell>
                <TableCell><p>{booking.hall_name}</p>{booking.hall_code && <p className="text-xs text-slate-400">{booking.hall_code}</p>}</TableCell>
                <TableCell><p>{formatDate(booking.event_date)}</p><p className="mt-1 text-xs text-slate-500">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p></TableCell>
                <TableCell>{booking.package_name ?? <span className="text-slate-400">None</span>}</TableCell>
                <TableCell><ConferaStatusBadge value={booking.booking_status} /></TableCell>
                <TableCell><BookingActions booking={booking} updating={updatingId === booking.event_booking_id} onStatusChange={onStatusChange} readOnly={readOnly} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {bookings.map((booking) => (
          <article key={booking.event_booking_id} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-medium text-slate-900">{booking.event_title}</h3><p className="mt-1 text-xs text-slate-500">{booking.booking_reference} - {booking.event_type}</p></div><ConferaStatusBadge value={booking.booking_status} /></div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-slate-400">Client</p><p className="mt-1 text-slate-700">{booking.client_name}</p></div><div><p className="text-xs text-slate-400">Hall</p><p className="mt-1 text-slate-700">{booking.hall_name}</p></div><div><p className="text-xs text-slate-400">Date</p><p className="mt-1 text-slate-700">{formatDate(booking.event_date)}</p></div><div><p className="text-xs text-slate-400">Time</p><p className="mt-1 text-slate-700">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p></div><div className="col-span-2"><p className="text-xs text-slate-400">Package</p><p className="mt-1 text-slate-700">{booking.package_name ?? "None"}</p></div></div>
            <div className="mt-4 border-t border-blue-50 pt-3"><BookingActions booking={booking} updating={updatingId === booking.event_booking_id} onStatusChange={onStatusChange} readOnly={readOnly} /></div>
          </article>
        ))}
      </div>
    </>
  )
}
