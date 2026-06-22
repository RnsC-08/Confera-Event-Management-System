export type ReportType = "bookings" | "payments" | "hall-usage" | "equipment" | "staff"

export type BookingReportRow = { booking_reference: string; event_title: string; client_name: string; hall_name: string; event_date: string; start_time: string; end_time: string; booking_status: string }
export type PaymentReportRow = { invoice_number: string; client_name: string; event_title: string; payment_date: string; amount: number | string; payment_method: string; status: string }
export type HallUsageReportRow = { hall_name: string; total_bookings: number | string; confirmed_bookings: number | string; completed_bookings: number | string }
export type EquipmentReportRow = { equipment_name: string; category: string; quantity_total: number; quantity_available: number; status: string }
export type StaffReportRow = { staff_name: string; role_name: string; total_assignments: number | string; completed_assignments: number | string; active_assignments: number | string }

export type ReportRows = {
  bookings: BookingReportRow[]
  payments: PaymentReportRow[]
  "hall-usage": HallUsageReportRow[]
  equipment: EquipmentReportRow[]
  staff: StaffReportRow[]
}
