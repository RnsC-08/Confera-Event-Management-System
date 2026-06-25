import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { getConferaSession } from "@/lib/confera-auth"
import { canViewFinancialData } from "@/lib/confera-permissions"
import { mysqlQuery } from "@/lib/mysql-db"

const REPORT_TYPES = ["bookings", "payments", "hall-usage", "equipment", "staff"] as const
type ReportType = (typeof REPORT_TYPES)[number]

type BookingReportRow = RowDataPacket & {
  booking_reference: string
  event_title: string
  client_name: string
  hall_name: string
  event_date: string
  start_time: string
  end_time: string
  booking_status: string
}

type PaymentReportRow = RowDataPacket & {
  invoice_number: string
  client_name: string
  event_title: string
  payment_date: string
  amount: number | string
  payment_method: string
  status: string
}

type HallUsageReportRow = RowDataPacket & {
  hall_name: string
  total_bookings: number | string
  confirmed_bookings: number | string
  completed_bookings: number | string
}

type EquipmentReportRow = RowDataPacket & {
  equipment_name: string
  category: string
  quantity_total: number
  quantity_available: number
  status: string
}

type StaffReportRow = RowDataPacket & {
  staff_name: string
  role_name: string
  total_assignments: number | string
  completed_assignments: number | string
  active_assignments: number | string
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

async function getBookingsReport() {
  return mysqlQuery<BookingReportRow[]>(
    `
      SELECT
        eb.booking_reference,
        e.title AS event_title,
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
      ORDER BY eb.event_date DESC, eb.start_time DESC, eb.event_booking_id DESC
    `,
  )
}

async function getPaymentsReport() {
  return mysqlQuery<PaymentReportRow[]>(
    `
      SELECT
        i.invoice_number,
        c.full_name AS client_name,
        e.title AS event_title,
        p.payment_date,
        p.amount,
        p.payment_method,
        p.status
      FROM payments p
      INNER JOIN invoices i ON p.invoice_id = i.invoice_id
      INNER JOIN event_bookings eb ON i.event_booking_id = eb.event_booking_id
      INNER JOIN clients c ON eb.client_id = c.client_id
      INNER JOIN events e ON eb.event_id = e.event_id
      ORDER BY p.payment_date DESC, p.payment_id DESC
    `,
  )
}

async function getHallUsageReport() {
  return mysqlQuery<HallUsageReportRow[]>(
    `
      SELECT
        eh.name AS hall_name,
        COUNT(eb.event_booking_id) AS total_bookings,
        SUM(CASE WHEN eb.booking_status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed_bookings,
        SUM(CASE WHEN eb.booking_status = 'Completed' THEN 1 ELSE 0 END) AS completed_bookings
      FROM event_halls eh
      LEFT JOIN event_bookings eb ON eh.event_hall_id = eb.event_hall_id
      WHERE eh.is_active = 1
      GROUP BY eh.event_hall_id, eh.name
      ORDER BY eh.name ASC
    `,
  )
}

async function getEquipmentReport() {
  return mysqlQuery<EquipmentReportRow[]>(
    `
      SELECT
        name AS equipment_name,
        category,
        quantity_total,
        quantity_available,
        status
      FROM equipment
      WHERE is_active = 1
      ORDER BY category ASC, name ASC
    `,
  )
}

async function getStaffReport() {
  return mysqlQuery<StaffReportRow[]>(
    `
      SELECT
        u.full_name AS staff_name,
        r.name AS role_name,
        COUNT(sa.staff_assignment_id) AS total_assignments,
        SUM(CASE WHEN sa.assignment_status = 'Completed' THEN 1 ELSE 0 END) AS completed_assignments,
        SUM(CASE WHEN sa.assignment_status IN ('Assigned', 'InProgress') THEN 1 ELSE 0 END) AS active_assignments
      FROM users u
      INNER JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN staff_assignments sa ON u.user_id = sa.user_id
      WHERE u.is_active = 1
      GROUP BY u.user_id, u.full_name, r.name
      ORDER BY u.full_name ASC
    `,
  )
}

export async function GET(req: NextRequest) {
  try {
    const session = await getConferaSession()
    const showFinancialData = Boolean(session && canViewFinancialData(session.role_name))
    const availableReportTypes = showFinancialData
      ? REPORT_TYPES
      : REPORT_TYPES.filter((reportType) => reportType !== "payments")
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")

    if (!type) {
      return NextResponse.json({
        available_report_types: availableReportTypes,
      })
    }

    if (!REPORT_TYPES.includes(type as ReportType)) {
      return badRequest(`type must be one of: ${REPORT_TYPES.join(", ")}`)
    }
    if (!showFinancialData && type === "payments") {
      return NextResponse.json({ error: "Operational Staff cannot view payment reports" }, { status: 403 })
    }

    switch (type as ReportType) {
      case "bookings":
        return NextResponse.json({
          type,
          rows: await getBookingsReport(),
        })
      case "payments":
        return NextResponse.json({
          type,
          rows: await getPaymentsReport(),
        })
      case "hall-usage":
        return NextResponse.json({
          type,
          rows: await getHallUsageReport(),
        })
      case "equipment":
        return NextResponse.json({
          type,
          rows: await getEquipmentReport(),
        })
      case "staff":
        return NextResponse.json({
          type,
          rows: await getStaffReport(),
        })
      default:
        return badRequest(`type must be one of: ${REPORT_TYPES.join(", ")}`)
    }
  } catch (error: any) {
    console.error("GET /api/confera/reports error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch report data",
        detail: error?.message ?? String(error),
      },
      { status: 500 },
    )
  }
}
