export type InvoiceStatus = "Unpaid" | "Partial" | "Paid"
export type PaymentMethod = "Cash" | "Card" | "Transfer" | "Other"
export type PaymentStatus = "Pending" | "Completed" | "Failed" | "Refunded"

export type Invoice = {
  invoice_id: number
  invoice_number: string
  invoice_date: string
  event_booking_id: number
  booking_reference: string
  client_id: number
  client_name: string
  event_title: string
  hall_name: string
  hall_amount: number | string
  package_amount: number | string
  services_amount: number | string
  equipment_amount: number | string
  discount_amount: number | string
  subtotal: number | string
  tax_amount: number | string
  total_amount: number | string
  paid_amount: number | string
  invoice_status: InvoiceStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type Payment = {
  payment_id: number
  invoice_id: number
  invoice_number: string
  payment_date: string
  amount: number | string
  payment_method: PaymentMethod
  reference_number: string | null
  status: PaymentStatus
  recorded_by_user_id: number | null
  notes: string | null
  created_at: string
}

export type InvoiceBooking = {
  event_booking_id: number
  booking_reference: string
  booking_status: string
  event_date: string
  event_title: string
  client_name: string
}
