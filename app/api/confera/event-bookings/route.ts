import { NextRequest, NextResponse } from "next/server"
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getConferaSession } from "@/lib/confera-auth"
import { canViewFinancialData } from "@/lib/confera-permissions"
import { getMysqlPool, mysqlQuery } from "@/lib/mysql-db"

const BOOKING_STATUSES = ["Draft", "Confirmed", "Cancelled", "Completed"] as const
type BookingStatus = (typeof BOOKING_STATUSES)[number]

type EventBookingRow = RowDataPacket & {
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

type ExistsRow = RowDataPacket & {
  id: number
}

type HallRow = RowDataPacket & {
  event_hall_id: number
  base_price: number | string
  status: string
}

type PackageRow = RowDataPacket & {
  service_package_id: number
  price: number | string
  is_active: number
  name?: string
}

type OverlapRow = RowDataPacket & {
  event_booking_id: number
  booking_reference: string
  start_time: string
  end_time: string
}

type EventBookingPayload = {
  event_booking_id?: unknown
  client_id?: unknown
  event_hall_id?: unknown
  event_date?: unknown
  start_time?: unknown
  end_time?: unknown
  event_title?: unknown
  event_type?: unknown
  participant_count?: unknown
  service_package_id?: unknown
  booking_status?: unknown
  description?: unknown
  notes?: unknown
  discount_amount?: unknown
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 })
}

function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 })
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

function normalizeOptionalPositiveInteger(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") return null
  return normalizePositiveInteger(value, fieldName)
}

function normalizeNonNegativeNumber(value: unknown, fieldName: string) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be 0 or greater`)
  }

  return parsed
}

function normalizeRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} is required`)
  }

  return value.trim()
}

function normalizeOptionalString(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  if (typeof value !== "string") {
    throw new Error("Expected a string value")
  }
  return value.trim()
}

function normalizeRequiredDate(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("event_date is required")
  }

  const normalized = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("event_date must be in YYYY-MM-DD format")
  }

  return normalized
}

function normalizeRequiredTime(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} is required`)
  }

  const normalized = value.trim()
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
    throw new Error(`${fieldName} must be in HH:MM or HH:MM:SS format`)
  }

  return normalized.length === 5 ? `${normalized}:00` : normalized
}

function ensureEndAfterStart(startTime: string, endTime: string) {
  if (endTime <= startTime) {
    throw new Error("end_time must be after start_time")
  }
}

function normalizeBookingStatus(value: unknown, required: boolean) {
  if (value === undefined && !required) return undefined
  if (typeof value !== "string" || value.trim() === "") {
    if (required) {
      throw new Error(`booking_status must be one of: ${BOOKING_STATUSES.join(", ")}`)
    }
    return undefined
  }

  const normalized = value.trim()
  if (!BOOKING_STATUSES.includes(normalized as BookingStatus)) {
    throw new Error(`booking_status must be one of: ${BOOKING_STATUSES.join(", ")}`)
  }

  return normalized as BookingStatus
}

function buildBookingsQuery(filters: {
  status?: string | null
  eventDate?: string | null
  eventHallId?: string | null
  clientId?: string | null
}) {
  let query = `
    SELECT
      eb.event_booking_id,
      eb.booking_reference,
      eb.booking_status,
      eb.event_date,
      eb.start_time,
      eb.end_time,
      c.client_id,
      c.full_name AS client_name,
      e.event_id,
      e.title AS event_title,
      e.event_type,
      e.participant_count,
      eh.event_hall_id,
      eh.name AS hall_name,
      eh.code AS hall_code,
      sp.service_package_id,
      sp.name AS package_name,
      eb.hall_base_price,
      eb.package_price,
      eb.discount_amount,
      eb.created_at,
      eb.updated_at
    FROM event_bookings eb
    INNER JOIN clients c ON eb.client_id = c.client_id
    INNER JOIN events e ON eb.event_id = e.event_id
    INNER JOIN event_halls eh ON eb.event_hall_id = eh.event_hall_id
    LEFT JOIN service_packages sp ON eb.service_package_id = sp.service_package_id
    WHERE 1 = 1
  `

  const params: Array<string | number> = []

  if (filters.status) {
    query += " AND eb.booking_status = ?"
    params.push(filters.status)
  }
  if (filters.eventDate) {
    query += " AND eb.event_date = ?"
    params.push(filters.eventDate)
  }
  if (filters.eventHallId) {
    query += " AND eb.event_hall_id = ?"
    params.push(Number(filters.eventHallId))
  }
  if (filters.clientId) {
    query += " AND eb.client_id = ?"
    params.push(Number(filters.clientId))
  }

  query += " ORDER BY eb.event_date ASC, eb.start_time ASC, eb.event_booking_id ASC"

  return { query, params }
}

async function ensureClientExists(connection: PoolConnection, clientId: number) {
  const [rows] = await connection.query<ExistsRow[]>(
    "SELECT client_id AS id FROM clients WHERE client_id = ?",
    [clientId],
  )
  if (rows.length === 0) {
    throw new Error("CLIENT_NOT_FOUND")
  }
}

async function getHall(connection: PoolConnection, eventHallId: number) {
  const [rows] = await connection.query<HallRow[]>(
    `
      SELECT event_hall_id, base_price, status
      FROM event_halls
      WHERE event_hall_id = ?
    `,
    [eventHallId],
  )

  if (rows.length === 0) {
    throw new Error("HALL_NOT_FOUND")
  }

  return rows[0]
}

async function getActivePackage(
  connection: PoolConnection,
  servicePackageId: number | null,
) {
  if (!servicePackageId) return null

  const [rows] = await connection.query<PackageRow[]>(
    `
      SELECT service_package_id, price, is_active
      FROM service_packages
      WHERE service_package_id = ?
    `,
    [servicePackageId],
  )

  if (rows.length === 0) {
    throw new Error("PACKAGE_NOT_FOUND")
  }

  if (rows[0].is_active !== 1) {
    throw new Error("PACKAGE_NOT_ACTIVE")
  }

  return rows[0]
}

async function findOverlap(
  connection: PoolConnection,
  input: {
    eventHallId: number
    eventDate: string
    startTime: string
    endTime: string
    excludeBookingId?: number
  },
) {
  const params: Array<string | number> = [
    input.eventHallId,
    input.eventDate,
    input.startTime,
    input.endTime,
  ]

  let query = `
    SELECT event_booking_id, booking_reference, start_time, end_time
    FROM event_bookings
    WHERE event_hall_id = ?
      AND event_date = ?
      AND booking_status = 'Confirmed'
      AND ? < end_time
      AND ? > start_time
  `

  if (input.excludeBookingId) {
    query += " AND event_booking_id <> ?"
    params.push(input.excludeBookingId)
  }

  query += " LIMIT 1"

  const [rows] = await connection.query<OverlapRow[]>(query, params)
  return rows[0] ?? null
}

function generateBookingReference(eventDate: string) {
  const compactDate = eventDate.replaceAll("-", "")
  const randomPart = Math.floor(100000 + Math.random() * 900000)
  return `CONF-${compactDate}-${randomPart}`
}

async function createUniqueBookingReference(
  connection: PoolConnection,
  eventDate: string,
) {
  for (let i = 0; i < 10; i += 1) {
    const candidate = generateBookingReference(eventDate)
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT 1 AS ok FROM event_bookings WHERE booking_reference = ? LIMIT 1",
      [candidate],
    )
    if (rows.length === 0) {
      return candidate
    }
  }

  throw new Error("Unable to generate a unique booking reference")
}

export async function GET(req: NextRequest) {
  try {
    const session = await getConferaSession()
    const showFinancialData = Boolean(session && canViewFinancialData(session.role_name))
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const eventDate = searchParams.get("event_date")
    const eventHallId = searchParams.get("event_hall_id")
    const clientId = searchParams.get("client_id")

    if (status && !BOOKING_STATUSES.includes(status as BookingStatus)) {
      return badRequest(`status must be one of: ${BOOKING_STATUSES.join(", ")}`)
    }

    const { query, params } = buildBookingsQuery({
      status,
      eventDate,
      eventHallId,
      clientId,
    })

    const bookings = await mysqlQuery<EventBookingRow[]>(query, params)
    return NextResponse.json(showFinancialData ? bookings : bookings.map(({ hall_base_price: _hallBasePrice, package_price: _packagePrice, discount_amount: _discountAmount, ...booking }) => booking))
  } catch (error: any) {
    console.error("GET /api/confera/event-bookings error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch event bookings",
        detail: error?.message ?? String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const pool = getMysqlPool()
  const connection = await pool.getConnection()

  try {
    const body = (await req.json()) as EventBookingPayload

    const clientId = normalizePositiveInteger(body.client_id, "client_id")
    const eventHallId = normalizePositiveInteger(body.event_hall_id, "event_hall_id")
    const eventDate = normalizeRequiredDate(body.event_date)
    const startTime = normalizeRequiredTime(body.start_time, "start_time")
    const endTime = normalizeRequiredTime(body.end_time, "end_time")
    ensureEndAfterStart(startTime, endTime)

    const eventTitle = normalizeRequiredString(body.event_title, "event_title")
    const eventType = normalizeRequiredString(body.event_type, "event_type")
    const participantCount = normalizeNonNegativeNumber(
      body.participant_count,
      "participant_count",
    )
    const servicePackageId = normalizeOptionalPositiveInteger(
      body.service_package_id,
      "service_package_id",
    )
    const bookingStatus =
      normalizeBookingStatus(body.booking_status, false) ?? "Draft"
    const description = normalizeOptionalString(body.description) ?? null
    const notes = normalizeOptionalString(body.notes) ?? null
    const discountAmount =
      body.discount_amount === undefined
        ? 0
        : normalizeNonNegativeNumber(body.discount_amount, "discount_amount")

    await connection.beginTransaction()

    await ensureClientExists(connection, clientId)
    const hall = await getHall(connection, eventHallId)

    if (hall.status === "Under maintenance") {
      throw new Error("HALL_UNDER_MAINTENANCE")
    }

    const servicePackage = await getActivePackage(connection, servicePackageId)

    if (bookingStatus === "Confirmed") {
      const overlap = await findOverlap(connection, {
        eventHallId,
        eventDate,
        startTime,
        endTime,
      })

      if (overlap) {
        throw new Error(
          `OVERLAP:${overlap.booking_reference}:${overlap.start_time}:${overlap.end_time}`,
        )
      }
    }

    const [eventResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO events (
          title,
          event_type,
          participant_count,
          description,
          notes
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [eventTitle, eventType, participantCount, description, notes],
    )

    const bookingReference = await createUniqueBookingReference(
      connection,
      eventDate,
    )

    const hallBasePrice = Number(hall.base_price)
    const packagePrice = servicePackage ? Number(servicePackage.price) : 0
    const hallStatusSnapshot =
      bookingStatus === "Confirmed" ? "Reserved" : null

    const [bookingResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO event_bookings (
          booking_reference,
          client_id,
          event_id,
          event_hall_id,
          service_package_id,
          created_by_user_id,
          event_date,
          start_time,
          end_time,
          booking_status,
          hall_status_snapshot,
          hall_base_price,
          package_price,
          discount_amount,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        bookingReference,
        clientId,
        eventResult.insertId,
        eventHallId,
        servicePackageId,
        1,
        eventDate,
        startTime,
        endTime,
        bookingStatus,
        hallStatusSnapshot,
        hallBasePrice,
        packagePrice,
        discountAmount,
        notes,
      ],
    )

    await connection.commit()

    const rows = await mysqlQuery<EventBookingRow[]>(
      `
        SELECT
          eb.event_booking_id,
          eb.booking_reference,
          eb.booking_status,
          eb.event_date,
          eb.start_time,
          eb.end_time,
          c.client_id,
          c.full_name AS client_name,
          e.event_id,
          e.title AS event_title,
          e.event_type,
          e.participant_count,
          eh.event_hall_id,
          eh.name AS hall_name,
          eh.code AS hall_code,
          sp.service_package_id,
          sp.name AS package_name,
          eb.hall_base_price,
          eb.package_price,
          eb.discount_amount,
          eb.created_at,
          eb.updated_at
        FROM event_bookings eb
        INNER JOIN clients c ON eb.client_id = c.client_id
        INNER JOIN events e ON eb.event_id = e.event_id
        INNER JOIN event_halls eh ON eb.event_hall_id = eh.event_hall_id
        LEFT JOIN service_packages sp ON eb.service_package_id = sp.service_package_id
        WHERE eb.event_booking_id = ?
      `,
      [bookingResult.insertId],
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (error: any) {
    try {
      await connection.rollback()
    } catch {}

    console.error("POST /api/confera/event-bookings error:", error)

    if (
      error?.message?.includes("required") ||
      error?.message?.includes("must be") ||
      error?.message?.includes("format")
    ) {
      return badRequest(error.message)
    }

    if (error?.message === "CLIENT_NOT_FOUND") {
      return notFound("Client not found")
    }
    if (error?.message === "HALL_NOT_FOUND") {
      return notFound("Event hall not found")
    }
    if (error?.message === "PACKAGE_NOT_FOUND") {
      return notFound("Service package not found")
    }
    if (error?.message === "PACKAGE_NOT_ACTIVE") {
      return badRequest("Service package must be active")
    }
    if (error?.message === "HALL_UNDER_MAINTENANCE") {
      return conflict("The selected hall is under maintenance and cannot be booked")
    }
    if (typeof error?.message === "string" && error.message.startsWith("OVERLAP:")) {
      const [, reference, existingStart, existingEnd] = error.message.split(":")
      return conflict(
        `Hall is already booked by confirmed booking ${reference} between ${existingStart} and ${existingEnd}`,
      )
    }

    return NextResponse.json(
      {
        error: "Failed to create event booking",
        detail: error?.message ?? String(error),
      },
      { status: 500 },
    )
  } finally {
    connection.release()
  }
}

export async function PATCH(req: NextRequest) {
  const pool = getMysqlPool()
  const connection = await pool.getConnection()

  try {
    const body = (await req.json()) as EventBookingPayload
    const eventBookingId = normalizePositiveInteger(
      body.event_booking_id,
      "event_booking_id",
    )

    const [existingRows] = await connection.query<RowDataPacket[]>(
      `
        SELECT
          event_booking_id,
          booking_status,
          event_hall_id,
          event_date,
          start_time,
          end_time
        FROM event_bookings
        WHERE event_booking_id = ?
      `,
      [eventBookingId],
    )

    if (existingRows.length === 0) {
      return notFound("Event booking not found")
    }

    const existing = existingRows[0]
    const updates: string[] = []
    const values: Array<string | number | null> = []

    let nextStatus = existing.booking_status as BookingStatus

    if (body.booking_status !== undefined) {
      nextStatus = normalizeBookingStatus(body.booking_status, true)!
      updates.push("booking_status = ?")
      values.push(nextStatus)
      if (nextStatus === "Cancelled") {
        updates.push("cancelled_at = CURRENT_TIMESTAMP")
      }
      if (nextStatus === "Completed") {
        updates.push("completed_at = CURRENT_TIMESTAMP")
      }
      if (nextStatus !== "Cancelled") {
        updates.push("hall_status_snapshot = ?")
        values.push(nextStatus === "Confirmed" ? "Reserved" : null)
      }
    }

    if (body.notes !== undefined) {
      updates.push("notes = ?")
      values.push(normalizeOptionalString(body.notes) ?? null)
    }

    if (body.discount_amount !== undefined) {
      updates.push("discount_amount = ?")
      values.push(normalizeNonNegativeNumber(body.discount_amount, "discount_amount"))
    }

    const restrictedFields = [
      "client_id",
      "event_hall_id",
      "event_date",
      "start_time",
      "end_time",
      "event_title",
      "event_type",
      "participant_count",
      "service_package_id",
      "description",
    ] as const

    for (const field of restrictedFields) {
      if (body[field] !== undefined) {
        return badRequest(
          "Updating hall, date, time, event details, client, or package is not supported in this step",
        )
      }
    }

    if (updates.length === 0) {
      return badRequest("No supported fields provided for update")
    }

    await connection.beginTransaction()

    if (nextStatus === "Confirmed") {
      const overlap = await findOverlap(connection, {
        eventHallId: Number(existing.event_hall_id),
        eventDate: String(existing.event_date),
        startTime: String(existing.start_time),
        endTime: String(existing.end_time),
        excludeBookingId: eventBookingId,
      })

      if (overlap) {
        throw new Error(
          `OVERLAP:${overlap.booking_reference}:${overlap.start_time}:${overlap.end_time}`,
        )
      }
    }

    const [result] = await connection.query<ResultSetHeader>(
      `
        UPDATE event_bookings
        SET ${updates.join(", ")}
        WHERE event_booking_id = ?
      `,
      [...values, eventBookingId],
    )

    if (result.affectedRows === 0) {
      await connection.rollback()
      return notFound("Event booking not found")
    }

    await connection.commit()

    const rows = await mysqlQuery<EventBookingRow[]>(
      `
        SELECT
          eb.event_booking_id,
          eb.booking_reference,
          eb.booking_status,
          eb.event_date,
          eb.start_time,
          eb.end_time,
          c.client_id,
          c.full_name AS client_name,
          e.event_id,
          e.title AS event_title,
          e.event_type,
          e.participant_count,
          eh.event_hall_id,
          eh.name AS hall_name,
          eh.code AS hall_code,
          sp.service_package_id,
          sp.name AS package_name,
          eb.hall_base_price,
          eb.package_price,
          eb.discount_amount,
          eb.created_at,
          eb.updated_at
        FROM event_bookings eb
        INNER JOIN clients c ON eb.client_id = c.client_id
        INNER JOIN events e ON eb.event_id = e.event_id
        INNER JOIN event_halls eh ON eb.event_hall_id = eh.event_hall_id
        LEFT JOIN service_packages sp ON eb.service_package_id = sp.service_package_id
        WHERE eb.event_booking_id = ?
      `,
      [eventBookingId],
    )

    return NextResponse.json(rows[0])
  } catch (error: any) {
    try {
      await connection.rollback()
    } catch {}

    console.error("PATCH /api/confera/event-bookings error:", error)

    if (
      error?.message?.includes("required") ||
      error?.message?.includes("must be") ||
      error?.message?.includes("not supported")
    ) {
      return badRequest(error.message)
    }

    if (typeof error?.message === "string" && error.message.startsWith("OVERLAP:")) {
      const [, reference, existingStart, existingEnd] = error.message.split(":")
      return conflict(
        `Hall is already booked by confirmed booking ${reference} between ${existingStart} and ${existingEnd}`,
      )
    }

    return NextResponse.json(
      {
        error: "Failed to update event booking",
        detail: error?.message ?? String(error),
      },
      { status: 500 },
    )
  } finally {
    connection.release()
  }
}
