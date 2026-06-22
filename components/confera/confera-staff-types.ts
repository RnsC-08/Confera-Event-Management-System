export const assignmentStatuses = ["Assigned", "InProgress", "Completed", "Cancelled"] as const
export type AssignmentStatus = (typeof assignmentStatuses)[number]

export type StaffAssignment = {
  staff_assignment_id: number
  event_booking_id: number
  booking_reference: string
  event_title: string | null
  user_id: number
  staff_name: string
  role_name: string
  assignment_role: string
  task_description: string | null
  assignment_status: AssignmentStatus
  assigned_at: string
  completed_at: string | null
  notes: string | null
}

export type ActiveStaffUser = {
  user_id: number
  full_name: string
  email: string | null
  role_name: string
}

export type StaffBooking = {
  event_booking_id: number
  booking_reference: string
  event_title: string
  client_name: string
  event_date: string
  booking_status: string
}
