import { NextRequest, NextResponse } from "next/server"
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getMysqlPool, mysqlQuery } from "@/lib/mysql-db"

const CLIENT_TYPES = ["Individual", "Company", "Organization"] as const
type ClientType = (typeof CLIENT_TYPES)[number]

type ClientRow = RowDataPacket & {
  client_id: number
  client_type: ClientType
  full_name: string
  organization_name: string | null
  email: string | null
  phone: string | null
  address_line: string | null
  tax_id: string | null
  notes: string | null
  is_active: number
}

type ClientPayload = {
  client_id?: unknown
  client_type?: unknown
  full_name?: unknown
  organization_name?: unknown
  email?: unknown
  phone?: unknown
  address_line?: unknown
  tax_id?: unknown
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

function normalizeRequiredName(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("full_name is required")
  }
  return value.trim()
}

function normalizeClientType(value: unknown, required: boolean) {
  if (value === undefined && !required) return undefined
  if (typeof value !== "string" || value.trim() === "") {
    if (required) throw new Error(`client_type must be one of: ${CLIENT_TYPES.join(", ")}`)
    return undefined
  }
  const normalized = value.trim()
  if (!CLIENT_TYPES.includes(normalized as ClientType)) {
    throw new Error(`client_type must be one of: ${CLIENT_TYPES.join(", ")}`)
  }
  return normalized as ClientType
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
    const clients = await mysqlQuery<ClientRow[]>(
      `
        SELECT
          client_id,
          client_type,
          full_name,
          organization_name,
          email,
          phone,
          address_line,
          tax_id,
          notes,
          is_active
        FROM clients
        WHERE is_active = ?
        ORDER BY full_name ASC
      `,
      [1],
    )

    return NextResponse.json(clients)
  } catch (error: any) {
    console.error("GET /api/confera/clients error:", error)
    return NextResponse.json(
      { error: "Failed to fetch clients", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ClientPayload
    const fullName = normalizeRequiredName(body.full_name)
    const clientType = normalizeClientType(body.client_type, false) ?? "Individual"
    const organizationName = normalizeOptionalString(body.organization_name) ?? null
    const email = normalizeOptionalString(body.email) ?? null
    const phone = normalizeOptionalString(body.phone) ?? null
    const addressLine = normalizeOptionalString(body.address_line) ?? null
    const taxId = normalizeOptionalString(body.tax_id) ?? null
    const notes = normalizeOptionalString(body.notes) ?? null
    const isActive = normalizeOptionalBooleanNumber(body.is_active) ?? 1

    const pool = getMysqlPool()
    const [result] = await pool.query<ResultSetHeader>(
      `
        INSERT INTO clients (
          client_type,
          full_name,
          organization_name,
          email,
          phone,
          address_line,
          tax_id,
          notes,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        clientType,
        fullName,
        organizationName,
        email,
        phone,
        addressLine,
        taxId,
        notes,
        isActive,
      ],
    )

    const createdRows = await mysqlQuery<ClientRow[]>(
      `
        SELECT
          client_id,
          client_type,
          full_name,
          organization_name,
          email,
          phone,
          address_line,
          tax_id,
          notes,
          is_active
        FROM clients
        WHERE client_id = ?
      `,
      [result.insertId],
    )

    return NextResponse.json(createdRows[0], { status: 201 })
  } catch (error: any) {
    console.error("POST /api/confera/clients error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "A client with the same email already exists" }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Failed to create client", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as ClientPayload
    const clientId =
      typeof body.client_id === "number"
        ? body.client_id
        : typeof body.client_id === "string"
          ? Number(body.client_id)
          : Number.NaN

    if (!Number.isInteger(clientId) || clientId <= 0) {
      return badRequest("client_id is required and must be a positive integer")
    }

    const updates: string[] = []
    const values: Array<string | number | null> = []

    if (body.client_type !== undefined) {
      updates.push("client_type = ?")
      values.push(normalizeClientType(body.client_type, true)!)
    }
    if (body.full_name !== undefined) {
      updates.push("full_name = ?")
      values.push(normalizeRequiredName(body.full_name))
    }
    if (body.organization_name !== undefined) {
      updates.push("organization_name = ?")
      values.push(normalizeOptionalString(body.organization_name) ?? null)
    }
    if (body.email !== undefined) {
      updates.push("email = ?")
      values.push(normalizeOptionalString(body.email) ?? null)
    }
    if (body.phone !== undefined) {
      updates.push("phone = ?")
      values.push(normalizeOptionalString(body.phone) ?? null)
    }
    if (body.address_line !== undefined) {
      updates.push("address_line = ?")
      values.push(normalizeOptionalString(body.address_line) ?? null)
    }
    if (body.tax_id !== undefined) {
      updates.push("tax_id = ?")
      values.push(normalizeOptionalString(body.tax_id) ?? null)
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
        UPDATE clients
        SET ${updates.join(", ")}
        WHERE client_id = ?
      `,
      [...values, clientId],
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const updatedRows = await mysqlQuery<ClientRow[]>(
      `
        SELECT
          client_id,
          client_type,
          full_name,
          organization_name,
          email,
          phone,
          address_line,
          tax_id,
          notes,
          is_active
        FROM clients
        WHERE client_id = ?
      `,
      [clientId],
    )

    return NextResponse.json(updatedRows[0])
  } catch (error: any) {
    console.error("PATCH /api/confera/clients error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "A client with the same email already exists" }, { status: 409 })
    }
    return NextResponse.json(
      { error: "Failed to update client", detail: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}
