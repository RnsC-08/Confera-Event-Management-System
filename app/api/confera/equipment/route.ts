import { NextRequest, NextResponse } from "next/server"
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getMysqlPool, mysqlQuery } from "@/lib/mysql-db"

const EQUIPMENT_STATUSES = [
  "Available",
  "Assigned",
  "Maintenance",
  "Unavailable",
] as const

type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number]

type EquipmentRow = RowDataPacket & {
  equipment_id: number
  name: string
  category: string
  quantity_total: number
  quantity_available: number
  unit_cost: number | string
  status: EquipmentStatus
  notes: string | null
  is_active: number
}

type EquipmentPayload = {
  equipment_id?: unknown
  name?: unknown
  category?: unknown
  quantity_total?: unknown
  quantity_available?: unknown
  unit_cost?: unknown
  status?: unknown
  notes?: unknown
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

function normalizeOptionalBooleanNumber(value: unknown) {
  if (value === undefined) return undefined
  if (typeof value === "boolean") return value ? 1 : 0
  if (value === 1 || value === 0) return value
  if (value === "1" || value === "true") return 1
  if (value === "0" || value === "false") return 0
  throw new Error("is_active must be a boolean, 0, or 1")
}

function normalizeEquipmentStatus(value: unknown, required: boolean) {
  if (value === undefined && !required) return undefined
  if (typeof value !== "string" || value.trim() === "") {
    if (required) {
      throw new Error(`status must be one of: ${EQUIPMENT_STATUSES.join(", ")}`)
    }
    return undefined
  }
  const normalized = value.trim()
  if (!EQUIPMENT_STATUSES.includes(normalized as EquipmentStatus)) {
    throw new Error(`status must be one of: ${EQUIPMENT_STATUSES.join(", ")}`)
  }
  return normalized as EquipmentStatus
}

export async function GET() {
  try {
    const equipment = await mysqlQuery<EquipmentRow[]>(
      `
        SELECT
          equipment_id,
          name,
          category,
          quantity_total,
          quantity_available,
          unit_cost,
          status,
          notes,
          is_active
        FROM equipment
        WHERE is_active = ?
        ORDER BY category ASC, name ASC
      `,
      [1],
    )

    return NextResponse.json(equipment)
  } catch (error: any) {
    console.error("GET /api/confera/equipment error:", error)
    return NextResponse.json(
      { error: "Failed to fetch equipment", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EquipmentPayload
    const name = normalizeRequiredString(body.name, "name")
    const category = normalizeRequiredString(body.category, "category")
    const quantityTotal = normalizeNonNegativeNumber(body.quantity_total, "quantity_total")
    const quantityAvailable =
      body.quantity_available === undefined
        ? quantityTotal
        : normalizeNonNegativeNumber(body.quantity_available, "quantity_available")
    const unitCost =
      body.unit_cost === undefined
        ? 0
        : normalizeNonNegativeNumber(body.unit_cost, "unit_cost")
    const status = normalizeEquipmentStatus(body.status, false) ?? "Available"
    const notes = normalizeOptionalString(body.notes) ?? null
    const isActive = normalizeOptionalBooleanNumber(body.is_active) ?? 1

    if (quantityAvailable > quantityTotal) {
      return badRequest("quantity_available cannot be greater than quantity_total")
    }

    const pool = getMysqlPool()
    const [result] = await pool.query<ResultSetHeader>(
      `
        INSERT INTO equipment (
          name,
          category,
          quantity_total,
          quantity_available,
          unit_cost,
          status,
          notes,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [name, category, quantityTotal, quantityAvailable, unitCost, status, notes, isActive],
    )

    const rows = await mysqlQuery<EquipmentRow[]>(
      `
        SELECT
          equipment_id,
          name,
          category,
          quantity_total,
          quantity_available,
          unit_cost,
          status,
          notes,
          is_active
        FROM equipment
        WHERE equipment_id = ?
      `,
      [result.insertId],
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (error: any) {
    console.error("POST /api/confera/equipment error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Equipment with the same name already exists" }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Failed to create equipment", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as EquipmentPayload
    const equipmentId =
      typeof body.equipment_id === "number"
        ? body.equipment_id
        : typeof body.equipment_id === "string"
          ? Number(body.equipment_id)
          : Number.NaN

    if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
      return badRequest("equipment_id is required and must be a positive integer")
    }

    const existingRows = await mysqlQuery<EquipmentRow[]>(
      `
        SELECT
          equipment_id,
          name,
          category,
          quantity_total,
          quantity_available,
          unit_cost,
          status,
          notes,
          is_active
        FROM equipment
        WHERE equipment_id = ?
      `,
      [equipmentId],
    )

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 })
    }

    const existing = existingRows[0]
    const nextQuantityTotal =
      body.quantity_total === undefined
        ? Number(existing.quantity_total)
        : normalizeNonNegativeNumber(body.quantity_total, "quantity_total")
    const nextQuantityAvailable =
      body.quantity_available === undefined
        ? Number(existing.quantity_available)
        : normalizeNonNegativeNumber(body.quantity_available, "quantity_available")

    if (nextQuantityAvailable > nextQuantityTotal) {
      return badRequest("quantity_available cannot be greater than quantity_total")
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
    if (body.quantity_total !== undefined) {
      updates.push("quantity_total = ?")
      values.push(nextQuantityTotal)
    }
    if (body.quantity_available !== undefined) {
      updates.push("quantity_available = ?")
      values.push(nextQuantityAvailable)
    }
    if (body.unit_cost !== undefined) {
      updates.push("unit_cost = ?")
      values.push(normalizeNonNegativeNumber(body.unit_cost, "unit_cost"))
    }
    if (body.status !== undefined) {
      updates.push("status = ?")
      values.push(normalizeEquipmentStatus(body.status, true)!)
    }
    if (body.notes !== undefined) {
      updates.push("notes = ?")
      values.push(normalizeOptionalString(body.notes) ?? null)
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
        UPDATE equipment
        SET ${updates.join(", ")}
        WHERE equipment_id = ?
      `,
      [...values, equipmentId],
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 })
    }

    const rows = await mysqlQuery<EquipmentRow[]>(
      `
        SELECT
          equipment_id,
          name,
          category,
          quantity_total,
          quantity_available,
          unit_cost,
          status,
          notes,
          is_active
        FROM equipment
        WHERE equipment_id = ?
      `,
      [equipmentId],
    )

    return NextResponse.json(rows[0])
  } catch (error: any) {
    console.error("PATCH /api/confera/equipment error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Equipment with the same name already exists" }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Failed to update equipment", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}
