import { NextRequest, NextResponse } from "next/server"
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getMysqlPool, mysqlQuery } from "@/lib/mysql-db"

const INVOICE_STATUSES = ["Unpaid", "Partial", "Paid"] as const
type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

type InvoiceRow = RowDataPacket & {
  invoice_id: number
  invoice_number: string
  invoice_date: string
  event_booking_id: number
  booking_reference: string
  client_id: number
  client_name: string
  event_title: string
  hall_name: string
  hall_amount: number | string
  package_amount: number | string
  services_amount: number | string
  equipment_amount: number | string
  discount_amount: number | string
  subtotal: number | string
  tax_amount: number | string
  total_amount: number | string
  paid_amount: number | string
  invoice_status: InvoiceStatus
  notes: string | null
  created_at: string
  updated_at: string
}

type BookingInvoiceSourceRow = RowDataPacket & {
  event_booking_id: number
  booking_reference: string
  booking_status: string
  hall_base_price: number | string
  package_price: number | string
  discount_amount: number | string
  client_id: number
  client_name: string
  event_title: string
  hall_name: string
}

type AggregateRow = RowDataPacket & {
  total: number | string | null
}

type InvoiceIdRow = RowDataPacket & {
  invoice_id: number
}

type InvoicePatchBaseRow = RowDataPacket & {
  invoice_id: number
  paid_amount: number | string
  hall_amount: number | string
  package_amount: number | string
  services_amount: number | string
  equipment_amount: number | string
  discount_amount: number | string
}

type InvoicePayload = {
  invoice_id?: unknown
  event_booking_id?: unknown
  tax_amount?: unknown
  notes?: unknown
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

function normalizeOptionalString(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  if (typeof value !== "string") {
    throw new Error("Expected a string value")
  }
  return value.trim()
}

function generateInvoiceNumber(invoiceDate: Date) {
  const year = invoiceDate.getFullYear()
  const month = String(invoiceDate.getMonth() + 1).padStart(2, "0")
  const day = String(invoiceDate.getDate()).padStart(2, "0")
  const randomPart = Math.floor(100000 + Math.random() * 900000)
  return `INV-${year}${month}${day}-${randomPart}`
}

async function createUniqueInvoiceNumber(
  connection: PoolConnection,
  invoiceDate: Date,
) {
  for (let i = 0; i < 10; i += 1) {
    const candidate = generateInvoiceNumber(invoiceDate)
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT 1 AS ok FROM invoices WHERE invoice_number = ? LIMIT 1",
      [candidate],
    )

    if (rows.length === 0) {
      return candidate
    }
  }

  throw new Error("Unable to generate a unique invoice number")
}

async function fetchInvoices(filters?: {
  invoiceStatus?: string | null
  eventBookingId?: string | null
  clientId?: string | null
}) {
  let query = `
    SELECT
      i.invoice_id,
      i.invoice_number,
      i.invoice_date,
      i.event_booking_id,
      eb.booking_reference,
      c.client_id,
      c.full_name AS client_name,
      e.title AS event_title,
      eh.name AS hall_name,
      i.hall_amount,
      i.package_amount,
      i.services_amount,
      i.equipment_amount,
      i.discount_amount,
      i.subtotal,
      i.tax_amount,
      i.total_amount,
      i.paid_amount,
      i.invoice_status,
      i.notes,
      i.created_at,
      i.updated_at
    FROM invoices i
    INNER JOIN event_bookings eb ON i.event_booking_id = eb.event_booking_id
    INNER JOIN clients c ON eb.client_id = c.client_id
    INNER JOIN events e ON eb.event_id = e.event_id
    INNER JOIN event_halls eh ON eb.event_hall_id = eh.event_hall_id
    WHERE 1 = 1
  `

  const params: Array<string | number> = []

  if (filters?.invoiceStatus) {
    query += " AND i.invoice_status = ?"
    params.push(filters.invoiceStatus)
  }

  if (filters?.eventBookingId) {
    query += " AND i.event_booking_id = ?"
    params.push(Number(filters.eventBookingId))
  }

  if (filters?.clientId) {
    query += " AND c.client_id = ?"
    params.push(Number(filters.clientId))
  }

  query += " ORDER BY i.invoice_date DESC, i.invoice_id DESC"

  return mysqlQuery<InvoiceRow[]>(query, params)
}

async function getBookingInvoiceSource(
  connection: PoolConnection,
  eventBookingId: number,
) {
  const [rows] = await connection.query<BookingInvoiceSourceRow[]>(
    `
      SELECT
        eb.event_booking_id,
        eb.booking_reference,
        eb.booking_status,
        eb.hall_base_price,
        eb.package_price,
        eb.discount_amount,
        c.client_id,
        c.full_name AS client_name,
        e.title AS event_title,
        eh.name AS hall_name
      FROM event_bookings eb
      INNER JOIN clients c ON eb.client_id = c.client_id
      INNER JOIN events e ON eb.event_id = e.event_id
      INNER JOIN event_halls eh ON eb.event_hall_id = eh.event_hall_id
      WHERE eb.event_booking_id = ?
    `,
    [eventBookingId],
  )

  return rows[0] ?? null
}

async function getExistingInvoiceForBooking(
  connection: PoolConnection,
  eventBookingId: number,
) {
  const [rows] = await connection.query<InvoiceIdRow[]>(
    "SELECT invoice_id FROM invoices WHERE event_booking_id = ? LIMIT 1",
    [eventBookingId],
  )

  return rows[0] ?? null
}

async function getServicesTotal(connection: PoolConnection, eventBookingId: number) {
  const [rows] = await connection.query<AggregateRow[]>(
    `
      SELECT COALESCE(SUM(line_total), 0) AS total
      FROM event_booking_services
      WHERE event_booking_id = ?
    `,
    [eventBookingId],
  )

  return Number(rows[0]?.total ?? 0)
}

async function getEquipmentTotal(connection: PoolConnection, eventBookingId: number) {
  const [rows] = await connection.query<AggregateRow[]>(
    `
      SELECT COALESCE(SUM(line_total), 0) AS total
      FROM booking_equipment
      WHERE event_booking_id = ?
        AND assignment_status = 'Assigned'
    `,
    [eventBookingId],
  )

  return Number(rows[0]?.total ?? 0)
}

async function getInvoicePatchBase(connection: PoolConnection, invoiceId: number) {
  const [rows] = await connection.query<InvoicePatchBaseRow[]>(
    `
      SELECT
        invoice_id,
        paid_amount,
        hall_amount,
        package_amount,
        services_amount,
        equipment_amount,
        discount_amount
      FROM invoices
      WHERE invoice_id = ?
    `,
    [invoiceId],
  )

  return rows[0] ?? null
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const invoiceStatus = searchParams.get("invoice_status")
    const eventBookingId = searchParams.get("event_booking_id")
    const clientId = searchParams.get("client_id")

    if (invoiceStatus && !INVOICE_STATUSES.includes(invoiceStatus as InvoiceStatus)) {
      return badRequest(
        `invoice_status must be one of: ${INVOICE_STATUSES.join(", ")}`,
      )
    }

    const rows = await fetchInvoices({ invoiceStatus, eventBookingId, clientId })
    return NextResponse.json(rows)
  } catch (error: any) {
    console.error("GET /api/confera/invoices error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch invoices",
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
    const body = (await req.json()) as InvoicePayload
    const eventBookingId = normalizePositiveInteger(
      body.event_booking_id,
      "event_booking_id",
    )
    const taxAmount =
      body.tax_amount === undefined
        ? 0
        : normalizeNonNegativeNumber(body.tax_amount, "tax_amount")
    const notes = normalizeOptionalString(body.notes) ?? null

    await connection.beginTransaction()

    const booking = await getBookingInvoiceSource(connection, eventBookingId)
    if (!booking) {
      await connection.rollback()
      return notFound("Event booking not found")
    }

    if (booking.booking_status === "Cancelled") {
      await connection.rollback()
      return badRequest("Cannot generate an invoice for a cancelled booking")
    }

    const existingInvoice = await getExistingInvoiceForBooking(connection, eventBookingId)
    if (existingInvoice) {
      await connection.rollback()
      return conflict("An invoice already exists for this booking")
    }

    const hallAmount = Number(booking.hall_base_price)
    const packageAmount = Number(booking.package_price)
    const servicesAmount = await getServicesTotal(connection, eventBookingId)
    const equipmentAmount = await getEquipmentTotal(connection, eventBookingId)
    const discountAmount = Number(booking.discount_amount)
    const subtotal = Number(
      (hallAmount + packageAmount + servicesAmount + equipmentAmount - discountAmount).toFixed(2),
    )
    const totalAmount = Number((subtotal + taxAmount).toFixed(2))
    const invoiceDate = new Date()
    const invoiceNumber = await createUniqueInvoiceNumber(connection, invoiceDate)

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO invoices (
          event_booking_id,
          invoice_number,
          invoice_date,
          hall_amount,
          package_amount,
          services_amount,
          equipment_amount,
          discount_amount,
          subtotal,
          tax_amount,
          total_amount,
          paid_amount,
          invoice_status,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        eventBookingId,
        invoiceNumber,
        invoiceDate,
        hallAmount,
        packageAmount,
        servicesAmount,
        equipmentAmount,
        discountAmount,
        subtotal,
        taxAmount,
        totalAmount,
        0,
        "Unpaid",
        notes,
      ],
    )

    await connection.commit()

    const invoices = await fetchInvoices({ eventBookingId: String(eventBookingId) })
    const created = invoices.find((invoice) => invoice.invoice_id === result.insertId)

    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    try {
      await connection.rollback()
    } catch {}

    console.error("POST /api/confera/invoices error:", error)

    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }

    if (error?.code === "ER_DUP_ENTRY") {
      return conflict("An invoice already exists for this booking")
    }

    return NextResponse.json(
      {
        error: "Failed to generate invoice",
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
    const body = (await req.json()) as InvoicePayload
    const invoiceId = normalizePositiveInteger(body.invoice_id, "invoice_id")
    const nextNotes =
      body.notes === undefined ? undefined : normalizeOptionalString(body.notes) ?? null
    const nextTaxAmount =
      body.tax_amount === undefined
        ? undefined
        : normalizeNonNegativeNumber(body.tax_amount, "tax_amount")

    if (nextNotes === undefined && nextTaxAmount === undefined) {
      return badRequest("No supported fields provided for update")
    }

    await connection.beginTransaction()

    const existing = await getInvoicePatchBase(connection, invoiceId)
    if (!existing) {
      await connection.rollback()
      return notFound("Invoice not found")
    }

    if (nextTaxAmount !== undefined && Number(existing.paid_amount) > 0) {
      await connection.rollback()
      return badRequest("Cannot change tax_amount after payments have been recorded")
    }

    const updates: string[] = []
    const values: Array<string | number | null> = []

    if (nextNotes !== undefined) {
      updates.push("notes = ?")
      values.push(nextNotes)
    }

    if (nextTaxAmount !== undefined) {
      const subtotal = Number(
        (
          Number(existing.hall_amount) +
          Number(existing.package_amount) +
          Number(existing.services_amount) +
          Number(existing.equipment_amount) -
          Number(existing.discount_amount)
        ).toFixed(2),
      )
      const totalAmount = Number((subtotal + nextTaxAmount).toFixed(2))

      updates.push("tax_amount = ?")
      values.push(nextTaxAmount)
      updates.push("subtotal = ?")
      values.push(subtotal)
      updates.push("total_amount = ?")
      values.push(totalAmount)
    }

    const [result] = await connection.query<ResultSetHeader>(
      `
        UPDATE invoices
        SET ${updates.join(", ")}
        WHERE invoice_id = ?
      `,
      [...values, invoiceId],
    )

    if (result.affectedRows === 0) {
      await connection.rollback()
      return notFound("Invoice not found")
    }

    await connection.commit()

    const invoices = await fetchInvoices()
    const updated = invoices.find((invoice) => invoice.invoice_id === invoiceId)

    return NextResponse.json(updated)
  } catch (error: any) {
    try {
      await connection.rollback()
    } catch {}

    console.error("PATCH /api/confera/invoices error:", error)

    if (
      error?.message?.includes("required") ||
      error?.message?.includes("must be") ||
      error?.message?.includes("No supported")
    ) {
      return badRequest(error.message)
    }

    return NextResponse.json(
      {
        error: "Failed to update invoice",
        detail: error?.message ?? String(error),
      },
      { status: 500 },
    )
  } finally {
    connection.release()
  }
}
