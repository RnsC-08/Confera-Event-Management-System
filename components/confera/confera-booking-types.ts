export type BookingStatus = "Draft" | "Confirmed" | "Cancelled" | "Completed"

export type EventBooking = {
  event_booking_id: number
  booking_reference: string
  booking_status: BookingStatus
  event_date: string
  start_time: string
  end_time: string
  client_id: number
  client_name: string
  event_id: number
  event_title: string
  event_type: string
  participant_count: number
  event_hall_id: number
  hall_name: string
  hall_code: string | null
  service_package_id: number | null
  package_name: string | null
  hall_base_price: number | string
  package_price: number | string
  discount_amount: number | string
  created_at: string
  updated_at: string
}

export type BookingClient = {
  client_id: number
  full_name: string
  organization_name: string | null
}

export type BookingHall = {
  event_hall_id: number
  name: string
  code: string | null
  capacity: number
  status: string
}

export type BookingPackage = {
  service_package_id: number
  name: string
  price: number | string
}

export type CreateBookingPayload = {
  client_id: number
  event_hall_id: number
  event_date: string
  start_time: string
  end_time: string
  event_title: string
  event_type: string
  participant_count: number
  service_package_id: number | null
  booking_status: "Draft" | "Confirmed"
  description: string | null
  notes: string | null
  discount_amount: number
}
