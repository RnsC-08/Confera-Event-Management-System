import { NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { getConferaSession } from "@/lib/confera-auth"
import { canViewFinancialData } from "@/lib/confera-permissions"
import { mysqlQuery } from "@/lib/mysql-db"

type CountRow = RowDataPacket & {
  total_active_halls: number | string
  total_active_clients: number | string
  total_confirmed_bookings: number | string
  total_draft_bookings: number | string
  total_completed_bookings: number | string
  total_unpaid_invoices: number | string
  total_partial_invoices: number | string
  total_paid_invoices: number | string
  total_available_equipment: number | string
  total_assigned_equipment: number | string
}

type UpcomingEventRow = RowDataPacket & {
  event_booking_id: number
  booking_reference: string
  event_title: string
  event_type: string
  client_name: string
  hall_name: string
  event_date: string
  start_time: string
  end_time: string
  booking_status: string
}

type HallStatusRow = RowDataPacket & {
  event_hall_id: number
  name: string
  code: string | null
  capacity: number
  status: string
}

type RecentInvoiceRow = RowDataPacket & {
  invoice_id: number
  invoice_number: string
  booking_reference: string
  client_name: string
  event_title: string
  total_amount: number | string
  paid_amount: number | string
  invoice_status: string
  invoice_date: string
}

type StaffTaskRow = RowDataPacket & {
  staff_assignment_id: number
  booking_reference: string
  event_title: string | null
  staff_name: string
  assignment_role: string
  assignment_status: string
  assigned_at: string
}

export async function GET() {
  try {
    const session = await getConferaSession()
    const showFinancialData = Boolean(session && canViewFinancialData(session.role_name))
    const countRows = await mysqlQuery<CountRow[]>(
      `
        SELECT
          (SELECT COUNT(*) FROM event_halls WHERE is_active = 1) AS total_active_halls,
          (SELECT COUNT(*) FROM clients WHERE is_active = 1) AS total_active_clients,
          (SELECT COUNT(*) FROM event_bookings WHERE booking_status = 'Confirmed') AS total_confirmed_bookings,
          (SELECT COUNT(*) FROM event_bookings WHERE booking_status = 'Draft') AS total_draft_bookings,
          (SELECT COUNT(*) FROM event_bookings WHERE booking_status = 'Completed') AS total_completed_bookings,
          (SELECT COUNT(*) FROM invoices WHERE invoice_status = 'Unpaid') AS total_unpaid_invoices,
          (SELECT COUNT(*) FROM invoices WHERE invoice_status = 'Partial') AS total_partial_invoices,
          (SELECT COUNT(*) FROM invoices WHERE invoice_status = 'Paid') AS total_paid_invoices,
          (SELECT COUNT(*) FROM equipment WHERE status = 'Available' AND is_active = 1) AS total_available_equipment,
          (SELECT COUNT(*) FROM equipment WHERE status = 'Assigned' AND is_active = 1) AS total_assigned_equipment
      `,
    )

    const upcomingEvents = await mysqlQuery<UpcomingEventRow[]>(
      `
        SELECT
          eb.event_booking_id,
          eb.booking_reference,
          e.title AS event_title,
          e.event_type,
          c.full_name AS client_name,
          eh.name AS hall_name,
          eb.event_date,
          eb.start_time,
          eb.end_time,
          eb.booking_status
        FROM event_bookings eb
        INNER JOIN events e ON eb.event_id = e.event_id
        INNER JOIN clients c ON eb.client_id = c.client_id
        INNER JOIN event_halls eh ON eb.event_hall_id = eh.event_hall_id
        WHERE eb.booking_status IN ('Draft', 'Confirmed')
          AND (
            eb.event_date > CURDATE()
            OR (eb.event_date = CURDATE() AND eb.end_time >= CURTIME())
          )
        ORDER BY eb.event_date ASC, eb.start_time ASC, eb.event_booking_id ASC
        LIMIT 5
      `,
    )

    const hallStatuses = await mysqlQuery<HallStatusRow[]>(
      `
        SELECT
          event_hall_id,
          name,
          code,
          capacity,
          status
        FROM event_halls
        WHERE is_active = 1
        ORDER BY name ASC
      `,
    )

    const recentInvoices = await mysqlQuery<RecentInvoiceRow[]>(
      `
        SELECT
          i.invoice_id,
          i.invoice_number,
          eb.booking_reference,
          c.full_name AS client_name,
          e.title AS event_title,
          i.total_amount,
          i.paid_amount,
          i.invoice_status,
          i.invoice_date
        FROM invoices i
        INNER JOIN event_bookings eb ON i.event_booking_id = eb.event_booking_id
        INNER JOIN clients c ON eb.client_id = c.client_id
        INNER JOIN events e ON eb.event_id = e.event_id
        ORDER BY i.invoice_date DESC, i.invoice_id DESC
        LIMIT 5
      `,
    )

    const staffTasks = await mysqlQuery<StaffTaskRow[]>(
      `
        SELECT
          sa.staff_assignment_id,
          eb.booking_reference,
          e.title AS event_title,
          u.full_name AS staff_name,
          sa.assignment_role,
          sa.assignment_status,
          sa.assigned_at
        FROM staff_assignments sa
        INNER JOIN event_bookings eb ON sa.event_booking_id = eb.event_booking_id
        LEFT JOIN events e ON eb.event_id = e.event_id
        INNER JOIN users u ON sa.user_id = u.user_id
        ORDER BY sa.assigned_at DESC, sa.staff_assignment_id DESC
        LIMIT 5
      `,
    )

    const counts = countRows[0] ?? {
        total_active_halls: 0,
        total_active_clients: 0,
        total_confirmed_bookings: 0,
        total_draft_bookings: 0,
        total_completed_bookings: 0,
        total_unpaid_invoices: 0,
        total_partial_invoices: 0,
        total_paid_invoices: 0,
        total_available_equipment: 0,
        total_assigned_equipment: 0,
      }

    if (!showFinancialData) {
      counts.total_unpaid_invoices = 0
      counts.total_partial_invoices = 0
      counts.total_paid_invoices = 0
    }

    return NextResponse.json({
      counts,
      upcoming_events: upcomingEvents,
      hall_statuses: hallStatuses,
      recent_invoices: showFinancialData ? recentInvoices : [],
      staff_tasks: staffTasks,
    })
  } catch (error: any) {
    console.error("GET /api/confera/dashboard error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard data",
        detail: error?.message ?? String(error),
      },
      { status: 500 },
    )
  }
}
