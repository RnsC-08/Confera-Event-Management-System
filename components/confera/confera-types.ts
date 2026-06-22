export type ConferaCounts = {
  total_active_halls: number
  total_active_clients: number
  total_confirmed_bookings: number
  total_draft_bookings: number
  total_completed_bookings: number
  total_unpaid_invoices: number
  total_partial_invoices: number
  total_paid_invoices: number
  total_available_equipment: number
  total_assigned_equipment: number
}

export type ConferaUpcomingEvent = {
  event_booking_id: number
  booking_reference: string
  event_title: string
  event_type: string
  client_name: string
  hall_name: string
  event_date: string
  start_time: string
  end_time: string
  booking_status: "Draft" | "Confirmed" | "Cancelled" | "Completed" | string
}

export type ConferaHallStatus = {
  event_hall_id: number
  name: string
  code: string | null
  capacity: number
  status:
    | "Available"
    | "Reserved"
    | "In preparation"
    | "In use"
    | "Completed"
    | "Under maintenance"
    | string
}

export type ConferaRecentInvoice = {
  invoice_id: number
  invoice_number: string
  booking_reference: string
  client_name: string
  event_title: string
  total_amount: number | string
  paid_amount: number | string
  invoice_status: "Unpaid" | "Partial" | "Paid" | string
  invoice_date: string
}

export type ConferaStaffTask = {
  staff_assignment_id: number
  booking_reference: string
  event_title: string | null
  staff_name: string
  assignment_role: string
  assignment_status: "Assigned" | "InProgress" | "Completed" | "Cancelled" | string
  assigned_at: string
}

export type ConferaDashboardData = {
  counts: ConferaCounts
  upcoming_events: ConferaUpcomingEvent[]
  hall_statuses: ConferaHallStatus[]
  recent_invoices: ConferaRecentInvoice[]
  staff_tasks: ConferaStaffTask[]
}
