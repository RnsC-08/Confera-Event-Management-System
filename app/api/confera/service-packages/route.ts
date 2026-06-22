import { NextRequest, NextResponse } from "next/server"
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getMysqlPool, mysqlQuery } from "@/lib/mysql-db"

type ServicePackageItemInput = {
  event_service_id?: unknown
  default_quantity?: unknown
  notes?: unknown
}

type ServicePackagePayload = {
  service_package_id?: unknown
  name?: unknown
  description?: unknown
  price?: unknown
  is_active?: unknown
  items?: unknown
}

type ServicePackageRow = RowDataPacket & {
  service_package_id: number
  name: string
  description: string | null
  price: number | string
  is_active: number
  service_package_item_id: number | null
  event_service_id: number | null
  event_service_name: string | null
  category: string | null
  default_quantity: number | string | null
  item_notes: string | null
}

type ExistingServiceRow = RowDataPacket & {
  event_service_id: number
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

function normalizeOptionalBooleanNumber(value: unknown) {
  if (value === undefined) return undefined
  if (typeof value === "boolean") return value ? 1 : 0
  if (value === 1 || value === 0) return value
  if (value === "1" || value === "true") return 1
  if (value === "0" || value === "false") return 0
  throw new Error("is_active must be a boolean, 0, or 1")
}

function normalizeItems(value: unknown) {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    throw new Error("items must be an array")
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`items[${index}] must be an object`)
    }
    const typed = item as ServicePackageItemInput
    const eventServiceId =
      typeof typed.event_service_id === "number"
        ? typed.event_service_id
        : typeof typed.event_service_id === "string"
          ? Number(typed.event_service_id)
          : Number.NaN
    if (!Number.isInteger(eventServiceId) || eventServiceId <= 0) {
      throw new Error(`items[${index}].event_service_id must be a positive integer`)
    }
    const defaultQuantity =
      typed.default_quantity === undefined
        ? 1
        : normalizePositiveNumber(typed.default_quantity, `items[${index}].default_quantity`)
    const notes = normalizeOptionalString(typed.notes) ?? null
    return {
      event_service_id: eventServiceId,
      default_quantity: defaultQuantity,
      notes,
    }
  })
}

async function fetchPackages() {
  const rows = await mysqlQuery<ServicePackageRow[]>(
    `
      SELECT
        sp.service_package_id,
        sp.name,
        sp.description,
        sp.price,
        sp.is_active,
        spi.service_package_item_id,
        spi.event_service_id,
        es.name AS event_service_name,
        es.category,
        spi.default_quantity,
        spi.notes AS item_notes
      FROM service_packages sp
      LEFT JOIN service_package_items spi
        ON sp.service_package_id = spi.service_package_id
      LEFT JOIN event_services es
        ON spi.event_service_id = es.event_service_id
      WHERE sp.is_active = ?
      ORDER BY sp.name ASC, es.category ASC, es.name ASC
    `,
    [1],
  )

  const packages = new Map<number, {
    service_package_id: number
    name: string
    description: string | null
    price: number | string
    is_active: number
    items: Array<{
      service_package_item_id: number
      event_service_id: number
      event_service_name: string
      category: string
      default_quantity: number | string
      notes: string | null
    }>
  }>()

  for (const row of rows) {
    if (!packages.has(row.service_package_id)) {
      packages.set(row.service_package_id, {
        service_package_id: row.service_package_id,
        name: row.name,
        description: row.description,
        price: row.price,
        is_active: row.is_active,
        items: [],
      })
    }
    if (row.service_package_item_id !== null && row.event_service_id !== null) {
      packages.get(row.service_package_id)!.items.push({
        service_package_item_id: row.service_package_item_id,
        event_service_id: row.event_service_id,
        event_service_name: row.event_service_name ?? "",
        category: row.category ?? "",
        default_quantity: row.default_quantity ?? 1,
        notes: row.item_notes,
      })
    }
  }

  return Array.from(packages.values())
}

async function ensureServicesExist(
  connection: PoolConnection,
  eventServiceIds: number[],
) {
  if (eventServiceIds.length === 0) return
  const placeholders = eventServiceIds.map(() => "?").join(", ")
  const [rows] = await connection.query<ExistingServiceRow[]>(
    `SELECT event_service_id FROM event_services WHERE event_service_id IN (${placeholders})`,
    eventServiceIds,
  )
  const found = new Set(rows.map((row) => row.event_service_id))
  const missing = eventServiceIds.filter((id) => !found.has(id))
  if (missing.length > 0) {
    throw new Error(`Referenced event_service_id values do not exist: ${missing.join(", ")}`)
  }
}

export async function GET() {
  try {
    return NextResponse.json(await fetchPackages())
  } catch (error: any) {
    console.error("GET /api/confera/service-packages error:", error)
    return NextResponse.json(
      { error: "Failed to fetch service packages", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const pool = getMysqlPool()
  const connection = await pool.getConnection()

  try {
    const body = (await req.json()) as ServicePackagePayload
    const name = normalizeRequiredString(body.name, "name")
    const price = normalizeNonNegativeNumber(body.price, "price")
    const description = normalizeOptionalString(body.description) ?? null
    const isActive = normalizeOptionalBooleanNumber(body.is_active) ?? 1
    const items = normalizeItems(body.items) ?? []

    await connection.beginTransaction()

    await ensureServicesExist(
      connection,
      Array.from(new Set(items.map((item) => item.event_service_id))),
    )

    const [packageResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO service_packages (
          name,
          description,
          price,
          is_active
        )
        VALUES (?, ?, ?, ?)
      `,
      [name, description, price, isActive],
    )

    for (const item of items) {
      await connection.query<ResultSetHeader>(
        `
          INSERT INTO service_package_items (
            service_package_id,
            event_service_id,
            default_quantity,
            notes
          )
          VALUES (?, ?, ?, ?)
        `,
        [packageResult.insertId, item.event_service_id, item.default_quantity, item.notes],
      )
    }

    await connection.commit()

    const created = (await fetchPackages()).find(
      (item) => item.service_package_id === packageResult.insertId,
    )

    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    try {
      await connection.rollback()
    } catch {}

    console.error("POST /api/confera/service-packages error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be") || error?.message?.includes("do not exist")) {
      return badRequest(error.message)
    }
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "A service package with the same name already exists" }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Failed to create service package", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  } finally {
    connection.release()
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as ServicePackagePayload
    const servicePackageId =
      typeof body.service_package_id === "number"
        ? body.service_package_id
        : typeof body.service_package_id === "string"
          ? Number(body.service_package_id)
          : Number.NaN

    if (!Number.isInteger(servicePackageId) || servicePackageId <= 0) {
      return badRequest("service_package_id is required and must be a positive integer")
    }

    const updates: string[] = []
    const values: Array<string | number | null> = []

    if (body.name !== undefined) {
      updates.push("name = ?")
      values.push(normalizeRequiredString(body.name, "name"))
    }
    if (body.description !== undefined) {
      updates.push("description = ?")
      values.push(normalizeOptionalString(body.description) ?? null)
    }
    if (body.price !== undefined) {
      updates.push("price = ?")
      values.push(normalizeNonNegativeNumber(body.price, "price"))
    }
    if (body.is_active !== undefined) {
      updates.push("is_active = ?")
      values.push(normalizeOptionalBooleanNumber(body.is_active)!)
    }
    if (body.items !== undefined) {
      return badRequest("Updating package items is not supported in this step")
    }

    if (updates.length === 0) {
      return badRequest("No fields provided for update")
    }

    const pool = getMysqlPool()
    const [result] = await pool.query<ResultSetHeader>(
      `
        UPDATE service_packages
        SET ${updates.join(", ")}
        WHERE service_package_id = ?
      `,
      [...values, servicePackageId],
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Service package not found" }, { status: 404 })
    }

    const updated = (await fetchPackages()).find(
      (item) => item.service_package_id === servicePackageId,
    )

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("PATCH /api/confera/service-packages error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be") || error?.message?.includes("not supported")) {
      return badRequest(error.message)
    }
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "A service package with the same name already exists" }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Failed to update service package", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}
