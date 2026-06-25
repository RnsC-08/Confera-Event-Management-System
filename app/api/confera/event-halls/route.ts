import { NextRequest, NextResponse } from "next/server"
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getConferaSession } from "@/lib/confera-auth"
import { canViewFinancialData } from "@/lib/confera-permissions"
import { getMysqlPool, mysqlQuery } from "@/lib/mysql-db"

const HALL_STATUSES = [
  "Available",
  "Reserved",
  "In preparation",
  "In use",
  "Completed",
  "Under maintenance",
] as const

type EventHallStatus = (typeof HALL_STATUSES)[number]

type EventHallRow = RowDataPacket & {
  event_hall_id: number
  name: string
  code: string | null
  capacity: number
  base_price: number
  status: EventHallStatus
  location_description: string | null
  maintenance_notes: string | null
  is_active: number
}

type EventHallPayload = {
  event_hall_id?: number
  name?: unknown
  code?: unknown
  capacity?: unknown
  base_price?: unknown
  status?: unknown
  location_description?: unknown
  maintenance_notes?: unknown
  is_active?: unknown
}

function isValidStatus(value: string): value is EventHallStatus {
  return HALL_STATUSES.includes(value as EventHallStatus)
}

function normalizeOptionalString(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  if (typeof value !== "string") {
    throw new Error("Expected a string value")
  }
  return value.trim()
}

function normalizeRequiredName(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("name is required")
  }
  return value.trim()
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

function normalizeOptionalBooleanNumber(value: unknown) {
  if (value === undefined) return undefined
  if (typeof value === "boolean") return value ? 1 : 0
  if (value === 1 || value === 0) return value
  if (value === "1" || value === "true") return 1
  if (value === "0" || value === "false") return 0
  throw new Error("is_active must be a boolean, 0, or 1")
}

function normalizeStatus(value: unknown, required: boolean) {
  if (value === undefined && !required) return undefined
  if (typeof value !== "string" || value.trim() === "") {
    if (required) {
      throw new Error(
        `status must be one of: ${HALL_STATUSES.join(", ")}`,
      )
    }
    return undefined
  }

  const status = value.trim()
  if (!isValidStatus(status)) {
    throw new Error(`status must be one of: ${HALL_STATUSES.join(", ")}`)
  }
  return status
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function GET() {
  try {
    const session = await getConferaSession()
    const showFinancialData = Boolean(session && canViewFinancialData(session.role_name))
    const halls = await mysqlQuery<EventHallRow[]>(
      `
        SELECT
          event_hall_id,
          name,
          code,
          capacity,
          base_price,
          status,
          location_description,
          maintenance_notes,
          is_active
        FROM event_halls
        WHERE is_active = ?
        ORDER BY name ASC
      `,
      [1],
    )

    return NextResponse.json(showFinancialData ? halls : halls.map(({ base_price: _basePrice, ...hall }) => hall))
  } catch (error: any) {
    console.error("GET /api/confera/event-halls error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch event halls",
        detail: error?.message ?? String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EventHallPayload

    const name = normalizeRequiredName(body.name)
    const capacity = normalizeNonNegativeNumber(body.capacity, "capacity")
    const basePrice = normalizeNonNegativeNumber(body.base_price, "base_price")
    const code = normalizeOptionalString(body.code) ?? null
    const status = normalizeStatus(body.status, false) ?? "Available"
    const locationDescription = normalizeOptionalString(body.location_description) ?? null
    const maintenanceNotes = normalizeOptionalString(body.maintenance_notes) ?? null
    const isActive = normalizeOptionalBooleanNumber(body.is_active) ?? 1

    const pool = getMysqlPool()
    const [result] = await pool.query<ResultSetHeader>(
      `
        INSERT INTO event_halls (
          name,
          code,
          capacity,
          base_price,
          status,
          location_description,
          maintenance_notes,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        code,
        capacity,
        basePrice,
        status,
        locationDescription,
        maintenanceNotes,
        isActive,
      ],
    )

    const createdRows = await mysqlQuery<EventHallRow[]>(
      `
        SELECT
          event_hall_id,
          name,
          code,
          capacity,
          base_price,
          status,
          location_description,
          maintenance_notes,
          is_active
        FROM event_halls
        WHERE event_hall_id = ?
      `,
      [result.insertId],
    )

    return NextResponse.json(createdRows[0], { status: 201 })
  } catch (error: any) {
    console.error("POST /api/confera/event-halls error:", error)

    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }

    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "An event hall with the same name or code already exists" },
        { status: 409 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to create event hall",
        detail: error?.message ?? String(error),
      },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as EventHallPayload
    const eventHallId =
      typeof body.event_hall_id === "number"
        ? body.event_hall_id
        : typeof body.event_hall_id === "string"
          ? Number(body.event_hall_id)
          : Number.NaN

    if (!Number.isInteger(eventHallId) || eventHallId <= 0) {
      return badRequest("event_hall_id is required and must be a positive integer")
    }

    const updates: string[] = []
    const values: Array<string | number | null> = []

    if (body.name !== undefined) {
      updates.push("name = ?")
      values.push(normalizeRequiredName(body.name))
    }
    if (body.code !== undefined) {
      updates.push("code = ?")
      values.push(normalizeOptionalString(body.code) ?? null)
    }
    if (body.capacity !== undefined) {
      updates.push("capacity = ?")
      values.push(normalizeNonNegativeNumber(body.capacity, "capacity"))
    }
    if (body.base_price !== undefined) {
      updates.push("base_price = ?")
      values.push(normalizeNonNegativeNumber(body.base_price, "base_price"))
    }
    if (body.status !== undefined) {
      updates.push("status = ?")
      values.push(normalizeStatus(body.status, true)!)
    }
    if (body.location_description !== undefined) {
      updates.push("location_description = ?")
      values.push(normalizeOptionalString(body.location_description) ?? null)
    }
    if (body.maintenance_notes !== undefined) {
      updates.push("maintenance_notes = ?")
      values.push(normalizeOptionalString(body.maintenance_notes) ?? null)
    }
    if (body.is_active !== undefined) {
      updates.push("is_active = ?")
      values.push(normalizeOptionalBooleanNumber(body.is_active)!)
    }

    if (updates.length === 0) {
      return badRequest("No fields provided for update")
    }

    const pool = getMysqlPool()
    const [result] = await pool.query<ResultSetHeader>(
      `
        UPDATE event_halls
        SET ${updates.join(", ")}
        WHERE event_hall_id = ?
      `,
      [...values, eventHallId],
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Event hall not found" }, { status: 404 })
    }

    const updatedRows = await mysqlQuery<EventHallRow[]>(
      `
        SELECT
          event_hall_id,
          name,
          code,
          capacity,
          base_price,
          status,
          location_description,
          maintenance_notes,
          is_active
        FROM event_halls
        WHERE event_hall_id = ?
      `,
      [eventHallId],
    )

    return NextResponse.json(updatedRows[0])
  } catch (error: any) {
    console.error("PATCH /api/confera/event-halls error:", error)

    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }

    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "An event hall with the same name or code already exists" },
        { status: 409 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to update event hall",
        detail: error?.message ?? String(error),
      },
      { status: 500 },
    )
  }
}
