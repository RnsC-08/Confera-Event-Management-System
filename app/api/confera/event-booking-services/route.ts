import { NextRequest, NextResponse } from "next/server"
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getMysqlPool, mysqlQuery } from "@/lib/mysql-db"

type BookingServiceRow = RowDataPacket & {
  event_booking_service_id: number
  event_booking_id: number
  event_service_id: number
  event_service_name: string
  category: string
  quantity: number | string
  unit_price: number | string
  line_total: number | string
  notes: string | null
}

type ExistsRow = RowDataPacket & {
  id: number
}

type ServiceRow = RowDataPacket & {
  event_service_id: number
  unit_price: number | string
  is_active: number
}

type BookingServicePayload = {
  event_booking_service_id?: unknown
  event_booking_id?: unknown
  event_service_id?: unknown
  quantity?: unknown
  unit_price?: unknown
  notes?: unknown
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

function normalizePositiveInteger(value: unknown, fieldName: string) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} is required and must be a positive integer`)
  }
  return parsed
}

function normalizePositiveNumber(value: unknown, fieldName: string) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be greater than 0`)
  }
  return parsed
}

function normalizeOptionalString(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  if (typeof value !== "string") throw new Error("Expected a string value")
  return value.trim()
}

async function ensureBookingExists(eventBookingId: number) {
  const rows = await mysqlQuery<ExistsRow[]>(
    "SELECT event_booking_id AS id FROM event_bookings WHERE event_booking_id = ?",
    [eventBookingId],
  )
  return rows.length > 0
}

async function getActiveService(eventServiceId: number) {
  const rows = await mysqlQuery<ServiceRow[]>(
    `
      SELECT event_service_id, unit_price, is_active
      FROM event_services
      WHERE event_service_id = ?
    `,
    [eventServiceId],
  )

  if (rows.length === 0) return null
  return rows[0]
}

async function fetchBookingServices(eventBookingId?: number) {
  let query = `
    SELECT
      ebs.event_booking_service_id,
      ebs.event_booking_id,
      ebs.event_service_id,
      es.name AS event_service_name,
      es.category,
      ebs.quantity,
      ebs.unit_price,
      ebs.line_total,
      ebs.notes
    FROM event_booking_services ebs
    INNER JOIN event_services es ON ebs.event_service_id = es.event_service_id
  `
  const params: Array<number> = []
  if (eventBookingId) {
    query += " WHERE ebs.event_booking_id = ?"
    params.push(eventBookingId)
  }
  query += " ORDER BY ebs.event_booking_id ASC, es.category ASC, es.name ASC"
  return mysqlQuery<BookingServiceRow[]>(query, params)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventBookingIdParam = searchParams.get("event_booking_id")
    const eventBookingId = eventBookingIdParam
      ? normalizePositiveInteger(eventBookingIdParam, "event_booking_id")
      : undefined

    return NextResponse.json(await fetchBookingServices(eventBookingId))
  } catch (error: any) {
    console.error("GET /api/confera/event-booking-services error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    return NextResponse.json(
      { error: "Failed to fetch event booking services", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BookingServicePayload
    const eventBookingId = normalizePositiveInteger(body.event_booking_id, "event_booking_id")
    const eventServiceId = normalizePositiveInteger(body.event_service_id, "event_service_id")
    const quantity =
      body.quantity === undefined
        ? 1
        : normalizePositiveNumber(body.quantity, "quantity")

    const bookingExists = await ensureBookingExists(eventBookingId)
    if (!bookingExists) {
      return NextResponse.json({ error: "Event booking not found" }, { status: 404 })
    }

    const service = await getActiveService(eventServiceId)
    if (!service) {
      return NextResponse.json({ error: "Event service not found" }, { status: 404 })
    }
    if (service.is_active !== 1) {
      return badRequest("Event service must be active")
    }

    const unitPrice =
      body.unit_price === undefined
        ? Number(service.unit_price)
        : normalizePositiveNumber(body.unit_price, "unit_price")
    const lineTotal = Number((quantity * unitPrice).toFixed(2))
    const notes = normalizeOptionalString(body.notes) ?? null

    const pool = getMysqlPool()
    const [result] = await pool.query<ResultSetHeader>(
      `
        INSERT INTO event_booking_services (
          event_booking_id,
          event_service_id,
          quantity,
          unit_price,
          line_total,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [eventBookingId, eventServiceId, quantity, unitPrice, lineTotal, notes],
    )

    const rows = await mysqlQuery<BookingServiceRow[]>(
      `
        SELECT
          ebs.event_booking_service_id,
          ebs.event_booking_id,
          ebs.event_service_id,
          es.name AS event_service_name,
          es.category,
          ebs.quantity,
          ebs.unit_price,
          ebs.line_total,
          ebs.notes
        FROM event_booking_services ebs
        INNER JOIN event_services es ON ebs.event_service_id = es.event_service_id
        WHERE ebs.event_booking_service_id = ?
      `,
      [result.insertId],
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (error: any) {
    console.error("POST /api/confera/event-booking-services error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "This service is already assigned to the booking" }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Failed to add event service to booking", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as BookingServicePayload
    const eventBookingServiceId = normalizePositiveInteger(
      body.event_booking_service_id,
      "event_booking_service_id",
    )

    const existingRows = await mysqlQuery<BookingServiceRow[]>(
      `
        SELECT
          ebs.event_booking_service_id,
          ebs.event_booking_id,
          ebs.event_service_id,
          es.name AS event_service_name,
          es.category,
          ebs.quantity,
          ebs.unit_price,
          ebs.line_total,
          ebs.notes
        FROM event_booking_services ebs
        INNER JOIN event_services es ON ebs.event_service_id = es.event_service_id
        WHERE ebs.event_booking_service_id = ?
      `,
      [eventBookingServiceId],
    )

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Event booking service not found" }, { status: 404 })
    }

    const existing = existingRows[0]
    const quantity =
      body.quantity === undefined
        ? Number(existing.quantity)
        : normalizePositiveNumber(body.quantity, "quantity")
    const unitPrice =
      body.unit_price === undefined
        ? Number(existing.unit_price)
        : normalizePositiveNumber(body.unit_price, "unit_price")
    const lineTotal = Number((quantity * unitPrice).toFixed(2))
    const notes =
      body.notes === undefined
        ? undefined
        : normalizeOptionalString(body.notes) ?? null

    const updates: string[] = []
    const values: Array<string | number | null> = []

    if (body.quantity !== undefined) {
      updates.push("quantity = ?")
      values.push(quantity)
    }
    if (body.unit_price !== undefined) {
      updates.push("unit_price = ?")
      values.push(unitPrice)
    }
    if (body.quantity !== undefined || body.unit_price !== undefined) {
      updates.push("line_total = ?")
      values.push(lineTotal)
    }
    if (body.notes !== undefined) {
      updates.push("notes = ?")
      values.push(notes!)
    }

    if (updates.length === 0) {
      return badRequest("No fields provided for update")
    }

    const pool = getMysqlPool()
    const [result] = await pool.query<ResultSetHeader>(
      `
        UPDATE event_booking_services
        SET ${updates.join(", ")}
        WHERE event_booking_service_id = ?
      `,
      [...values, eventBookingServiceId],
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Event booking service not found" }, { status: 404 })
    }

    const rows = await mysqlQuery<BookingServiceRow[]>(
      `
        SELECT
          ebs.event_booking_service_id,
          ebs.event_booking_id,
          ebs.event_service_id,
          es.name AS event_service_name,
          es.category,
          ebs.quantity,
          ebs.unit_price,
          ebs.line_total,
          ebs.notes
        FROM event_booking_services ebs
        INNER JOIN event_services es ON ebs.event_service_id = es.event_service_id
        WHERE ebs.event_booking_service_id = ?
      `,
      [eventBookingServiceId],
    )

    return NextResponse.json(rows[0])
  } catch (error: any) {
    console.error("PATCH /api/confera/event-booking-services error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    return NextResponse.json(
      { error: "Failed to update event booking service", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}
