import { NextRequest, NextResponse } from "next/server"
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getMysqlPool, mysqlQuery } from "@/lib/mysql-db"

const ASSIGNMENT_STATUSES = ["Assigned", "Released", "Cancelled"] as const
type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]

type BookingEquipmentRow = RowDataPacket & {
  booking_equipment_id: number
  event_booking_id: number
  equipment_id: number
  equipment_name: string
  category: string
  quantity_assigned: number
  unit_price: number | string
  line_total: number | string
  assignment_status: AssignmentStatus
  notes: string | null
}

type EquipmentRow = RowDataPacket & {
  equipment_id: number
  quantity_available: number
  quantity_total: number
  unit_cost: number | string
  status: string
  is_active: number
}

type ExistsRow = RowDataPacket & {
  id: number
}

type BookingEquipmentPayload = {
  booking_equipment_id?: unknown
  event_booking_id?: unknown
  equipment_id?: unknown
  quantity_assigned?: unknown
  unit_price?: unknown
  assignment_status?: unknown
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

function normalizeAssignmentStatus(value: unknown, required: boolean) {
  if (value === undefined && !required) return undefined
  if (typeof value !== "string" || value.trim() === "") {
    if (required) {
      throw new Error(`assignment_status must be one of: ${ASSIGNMENT_STATUSES.join(", ")}`)
    }
    return undefined
  }
  const normalized = value.trim()
  if (!ASSIGNMENT_STATUSES.includes(normalized as AssignmentStatus)) {
    throw new Error(`assignment_status must be one of: ${ASSIGNMENT_STATUSES.join(", ")}`)
  }
  return normalized as AssignmentStatus
}

async function ensureBookingExists(connection: PoolConnection, eventBookingId: number) {
  const [rows] = await connection.query<ExistsRow[]>(
    "SELECT event_booking_id AS id FROM event_bookings WHERE event_booking_id = ?",
    [eventBookingId],
  )
  return rows.length > 0
}

async function getEquipment(connection: PoolConnection, equipmentId: number) {
  const [rows] = await connection.query<EquipmentRow[]>(
    `
      SELECT
        equipment_id,
        quantity_available,
        quantity_total,
        unit_cost,
        status,
        is_active
      FROM equipment
      WHERE equipment_id = ?
    `,
    [equipmentId],
  )
  return rows[0] ?? null
}

async function fetchBookingEquipment(eventBookingId?: number) {
  let query = `
    SELECT
      be.booking_equipment_id,
      be.event_booking_id,
      be.equipment_id,
      e.name AS equipment_name,
      e.category,
      be.quantity_assigned,
      be.unit_price,
      be.line_total,
      be.assignment_status,
      be.notes
    FROM booking_equipment be
    INNER JOIN equipment e ON be.equipment_id = e.equipment_id
  `
  const params: Array<number> = []
  if (eventBookingId) {
    query += " WHERE be.event_booking_id = ?"
    params.push(eventBookingId)
  }
  query += " ORDER BY be.event_booking_id ASC, e.category ASC, e.name ASC"
  return mysqlQuery<BookingEquipmentRow[]>(query, params)
}

function deriveEquipmentStatus(input: {
  currentStatus: string
  quantityAvailable: number
  quantityTotal: number
}) {
  if (input.currentStatus === "Maintenance" || input.currentStatus === "Unavailable") {
    return input.currentStatus
  }
  if (input.quantityAvailable < input.quantityTotal) {
    return "Assigned"
  }
  return "Available"
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventBookingIdParam = searchParams.get("event_booking_id")
    const eventBookingId = eventBookingIdParam
      ? normalizePositiveInteger(eventBookingIdParam, "event_booking_id")
      : undefined

    return NextResponse.json(await fetchBookingEquipment(eventBookingId))
  } catch (error: any) {
    console.error("GET /api/confera/booking-equipment error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    return NextResponse.json(
      { error: "Failed to fetch booking equipment", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const pool = getMysqlPool()
  const connection = await pool.getConnection()

  try {
    const body = (await req.json()) as BookingEquipmentPayload
    const eventBookingId = normalizePositiveInteger(body.event_booking_id, "event_booking_id")
    const equipmentId = normalizePositiveInteger(body.equipment_id, "equipment_id")
    const quantityAssigned = normalizePositiveInteger(body.quantity_assigned, "quantity_assigned")
    const notes = normalizeOptionalString(body.notes) ?? null

    await connection.beginTransaction()

    const bookingExists = await ensureBookingExists(connection, eventBookingId)
    if (!bookingExists) {
      await connection.rollback()
      return NextResponse.json({ error: "Event booking not found" }, { status: 404 })
    }

    const equipment = await getEquipment(connection, equipmentId)
    if (!equipment) {
      await connection.rollback()
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 })
    }
    if (equipment.is_active !== 1) {
      await connection.rollback()
      return badRequest("Equipment must be active")
    }
    if (quantityAssigned > Number(equipment.quantity_available)) {
      await connection.rollback()
      return badRequest("quantity_assigned cannot be greater than equipment.quantity_available")
    }

    const unitPrice =
      body.unit_price === undefined
        ? Number(equipment.unit_cost)
        : normalizePositiveNumber(body.unit_price, "unit_price")
    const lineTotal = Number((quantityAssigned * unitPrice).toFixed(2))

    const [insertResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO booking_equipment (
          event_booking_id,
          equipment_id,
          quantity_assigned,
          unit_price,
          line_total,
          assignment_status,
          notes
        )
        VALUES (?, ?, ?, ?, ?, 'Assigned', ?)
      `,
      [eventBookingId, equipmentId, quantityAssigned, unitPrice, lineTotal, notes],
    )

    const nextAvailable = Number(equipment.quantity_available) - quantityAssigned
    const nextStatus = deriveEquipmentStatus({
      currentStatus: equipment.status,
      quantityAvailable: nextAvailable,
      quantityTotal: Number(equipment.quantity_total),
    })

    await connection.query<ResultSetHeader>(
      `
        UPDATE equipment
        SET quantity_available = ?, status = ?
        WHERE equipment_id = ?
      `,
      [nextAvailable, nextStatus, equipmentId],
    )

    await connection.commit()

    const rows = await mysqlQuery<BookingEquipmentRow[]>(
      `
        SELECT
          be.booking_equipment_id,
          be.event_booking_id,
          be.equipment_id,
          e.name AS equipment_name,
          e.category,
          be.quantity_assigned,
          be.unit_price,
          be.line_total,
          be.assignment_status,
          be.notes
        FROM booking_equipment be
        INNER JOIN equipment e ON be.equipment_id = e.equipment_id
        WHERE be.booking_equipment_id = ?
      `,
      [insertResult.insertId],
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (error: any) {
    try {
      await connection.rollback()
    } catch {}
    console.error("POST /api/confera/booking-equipment error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "This equipment is already assigned to the booking" }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Failed to assign equipment to booking", detail: error?.message ?? String(error) },
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
    const body = (await req.json()) as BookingEquipmentPayload
    const bookingEquipmentId = normalizePositiveInteger(
      body.booking_equipment_id,
      "booking_equipment_id",
    )

    const [existingRows] = await connection.query<BookingEquipmentRow[]>(
      `
        SELECT
          be.booking_equipment_id,
          be.event_booking_id,
          be.equipment_id,
          e.name AS equipment_name,
          e.category,
          be.quantity_assigned,
          be.unit_price,
          be.line_total,
          be.assignment_status,
          be.notes
        FROM booking_equipment be
        INNER JOIN equipment e ON be.equipment_id = e.equipment_id
        WHERE be.booking_equipment_id = ?
      `,
      [bookingEquipmentId],
    )

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Booking equipment assignment not found" }, { status: 404 })
    }

    const existing = existingRows[0]
    const nextStatus =
      body.assignment_status === undefined
        ? undefined
        : normalizeAssignmentStatus(body.assignment_status, true)!
    const nextNotes =
      body.notes === undefined
        ? undefined
        : normalizeOptionalString(body.notes) ?? null

    const updates: string[] = []
    const values: Array<string | null> = []

    if (nextStatus !== undefined) {
      updates.push("assignment_status = ?")
      values.push(nextStatus)
    }
    if (nextNotes !== undefined) {
      updates.push("notes = ?")
      values.push(nextNotes)
    }

    if (updates.length === 0) {
      return badRequest("No fields provided for update")
    }

    await connection.beginTransaction()

    const equipment = await getEquipment(connection, existing.equipment_id)
    if (!equipment) {
      await connection.rollback()
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 })
    }

    const currentStatus = existing.assignment_status
    const shouldRestore =
      nextStatus !== undefined &&
      (nextStatus === "Released" || nextStatus === "Cancelled") &&
      currentStatus !== "Released" &&
      currentStatus !== "Cancelled"

    if (shouldRestore) {
      const restoredAvailable =
        Number(equipment.quantity_available) + Number(existing.quantity_assigned)
      const cappedAvailable = Math.min(restoredAvailable, Number(equipment.quantity_total))
      const equipmentStatus = deriveEquipmentStatus({
        currentStatus: equipment.status,
        quantityAvailable: cappedAvailable,
        quantityTotal: Number(equipment.quantity_total),
      })

      await connection.query<ResultSetHeader>(
        `
          UPDATE equipment
          SET quantity_available = ?, status = ?
          WHERE equipment_id = ?
        `,
        [cappedAvailable, equipmentStatus, existing.equipment_id],
      )
    }

    const [updateResult] = await connection.query<ResultSetHeader>(
      `
        UPDATE booking_equipment
        SET ${updates.join(", ")}
        WHERE booking_equipment_id = ?
      `,
      [...values, String(bookingEquipmentId)],
    )

    if (updateResult.affectedRows === 0) {
      await connection.rollback()
      return NextResponse.json({ error: "Booking equipment assignment not found" }, { status: 404 })
    }

    await connection.commit()

    const rows = await mysqlQuery<BookingEquipmentRow[]>(
      `
        SELECT
          be.booking_equipment_id,
          be.event_booking_id,
          be.equipment_id,
          e.name AS equipment_name,
          e.category,
          be.quantity_assigned,
          be.unit_price,
          be.line_total,
          be.assignment_status,
          be.notes
        FROM booking_equipment be
        INNER JOIN equipment e ON be.equipment_id = e.equipment_id
        WHERE be.booking_equipment_id = ?
      `,
      [bookingEquipmentId],
    )

    return NextResponse.json(rows[0])
  } catch (error: any) {
    try {
      await connection.rollback()
    } catch {}
    console.error("PATCH /api/confera/booking-equipment error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    return NextResponse.json(
      { error: "Failed to update booking equipment", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  } finally {
    connection.release()
  }
}
