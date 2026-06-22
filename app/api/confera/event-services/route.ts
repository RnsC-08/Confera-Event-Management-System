import { NextRequest, NextResponse } from "next/server"
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getMysqlPool, mysqlQuery } from "@/lib/mysql-db"

const PRICING_MODELS = ["Flat", "PerUnit", "PerGuest", "PerHour"] as const
type PricingModel = (typeof PRICING_MODELS)[number]

type EventServiceRow = RowDataPacket & {
  event_service_id: number
  name: string
  category: string
  unit_price: number | string
  pricing_model: PricingModel
  unit_label: string | null
  description: string | null
  is_active: number
}

type EventServicePayload = {
  event_service_id?: unknown
  name?: unknown
  category?: unknown
  unit_price?: unknown
  pricing_model?: unknown
  unit_label?: unknown
  description?: unknown
  is_active?: unknown
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

function normalizeOptionalString(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  if (typeof value !== "string") throw new Error("Expected a string value")
  return value.trim()
}

function normalizeRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} is required`)
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

function normalizePricingModel(value: unknown, required: boolean) {
  if (value === undefined && !required) return undefined
  if (typeof value !== "string" || value.trim() === "") {
    if (required) throw new Error(`pricing_model must be one of: ${PRICING_MODELS.join(", ")}`)
    return undefined
  }
  const normalized = value.trim()
  if (!PRICING_MODELS.includes(normalized as PricingModel)) {
    throw new Error(`pricing_model must be one of: ${PRICING_MODELS.join(", ")}`)
  }
  return normalized as PricingModel
}

function normalizeOptionalBooleanNumber(value: unknown) {
  if (value === undefined) return undefined
  if (typeof value === "boolean") return value ? 1 : 0
  if (value === 1 || value === 0) return value
  if (value === "1" || value === "true") return 1
  if (value === "0" || value === "false") return 0
  throw new Error("is_active must be a boolean, 0, or 1")
}

export async function GET() {
  try {
    const services = await mysqlQuery<EventServiceRow[]>(
      `
        SELECT
          event_service_id,
          name,
          category,
          unit_price,
          pricing_model,
          unit_label,
          description,
          is_active
        FROM event_services
        WHERE is_active = ?
        ORDER BY category ASC, name ASC
      `,
      [1],
    )
    return NextResponse.json(services)
  } catch (error: any) {
    console.error("GET /api/confera/event-services error:", error)
    return NextResponse.json(
      { error: "Failed to fetch event services", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EventServicePayload
    const name = normalizeRequiredString(body.name, "name")
    const category = normalizeRequiredString(body.category, "category")
    const unitPrice = normalizeNonNegativeNumber(body.unit_price, "unit_price")
    const pricingModel = normalizePricingModel(body.pricing_model, false) ?? "Flat"
    const unitLabel = normalizeOptionalString(body.unit_label) ?? null
    const description = normalizeOptionalString(body.description) ?? null
    const isActive = normalizeOptionalBooleanNumber(body.is_active) ?? 1

    const pool = getMysqlPool()
    const [result] = await pool.query<ResultSetHeader>(
      `
        INSERT INTO event_services (
          name,
          category,
          unit_price,
          pricing_model,
          unit_label,
          description,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [name, category, unitPrice, pricingModel, unitLabel, description, isActive],
    )

    const createdRows = await mysqlQuery<EventServiceRow[]>(
      `
        SELECT
          event_service_id,
          name,
          category,
          unit_price,
          pricing_model,
          unit_label,
          description,
          is_active
        FROM event_services
        WHERE event_service_id = ?
      `,
      [result.insertId],
    )

    return NextResponse.json(createdRows[0], { status: 201 })
  } catch (error: any) {
    console.error("POST /api/confera/event-services error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "An event service with the same name already exists" }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Failed to create event service", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as EventServicePayload
    const eventServiceId =
      typeof body.event_service_id === "number"
        ? body.event_service_id
        : typeof body.event_service_id === "string"
          ? Number(body.event_service_id)
          : Number.NaN

    if (!Number.isInteger(eventServiceId) || eventServiceId <= 0) {
      return badRequest("event_service_id is required and must be a positive integer")
    }

    const updates: string[] = []
    const values: Array<string | number | null> = []

    if (body.name !== undefined) {
      updates.push("name = ?")
      values.push(normalizeRequiredString(body.name, "name"))
    }
    if (body.category !== undefined) {
      updates.push("category = ?")
      values.push(normalizeRequiredString(body.category, "category"))
    }
    if (body.unit_price !== undefined) {
      updates.push("unit_price = ?")
      values.push(normalizeNonNegativeNumber(body.unit_price, "unit_price"))
    }
    if (body.pricing_model !== undefined) {
      updates.push("pricing_model = ?")
      values.push(normalizePricingModel(body.pricing_model, true)!)
    }
    if (body.unit_label !== undefined) {
      updates.push("unit_label = ?")
      values.push(normalizeOptionalString(body.unit_label) ?? null)
    }
    if (body.description !== undefined) {
      updates.push("description = ?")
      values.push(normalizeOptionalString(body.description) ?? null)
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
        UPDATE event_services
        SET ${updates.join(", ")}
        WHERE event_service_id = ?
      `,
      [...values, eventServiceId],
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Event service not found" }, { status: 404 })
    }

    const updatedRows = await mysqlQuery<EventServiceRow[]>(
      `
        SELECT
          event_service_id,
          name,
          category,
          unit_price,
          pricing_model,
          unit_label,
          description,
          is_active
        FROM event_services
        WHERE event_service_id = ?
      `,
      [eventServiceId],
    )

    return NextResponse.json(updatedRows[0])
  } catch (error: any) {
    console.error("PATCH /api/confera/event-services error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "An event service with the same name already exists" }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Failed to update event service", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}
