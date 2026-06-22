import { NextRequest, NextResponse } from "next/server"
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getMysqlPool, mysqlQuery } from "@/lib/mysql-db"

const PAYMENT_METHODS = ["Cash", "Card", "Transfer", "Other"] as const
const PAYMENT_STATUSES = ["Pending", "Completed", "Failed", "Refunded"] as const
const INVOICE_STATUSES = ["Unpaid", "Partial", "Paid"] as const

type PaymentMethod = (typeof PAYMENT_METHODS)[number]
type PaymentStatus = (typeof PAYMENT_STATUSES)[number]
type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

type PaymentRow = RowDataPacket & {
  payment_id: number
  invoice_id: number
  invoice_number: string
  payment_date: string
  amount: number | string
  payment_method: PaymentMethod
  reference_number: string | null
  status: PaymentStatus
  recorded_by_user_id: number | null
  notes: string | null
  created_at: string
}

type InvoicePaymentRow = RowDataPacket & {
  invoice_id: number
  invoice_number: string
  total_amount: number | string
  paid_amount: number | string
}

type PaymentPayload = {
  payment_id?: unknown
  invoice_id?: unknown
  amount?: unknown
  payment_method?: unknown
  reference_number?: unknown
  status?: unknown
  recorded_by_user_id?: unknown
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

function normalizeOptionalPositiveInteger(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") return null
  return normalizePositiveInteger(value, fieldName)
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
  if (typeof value !== "string") {
    throw new Error("Expected a string value")
  }
  return value.trim()
}

function normalizePaymentMethod(value: unknown, required: boolean) {
  if (value === undefined && !required) return undefined
  if (typeof value !== "string" || value.trim() === "") {
    if (required) {
      throw new Error(`payment_method must be one of: ${PAYMENT_METHODS.join(", ")}`)
    }
    return undefined
  }

  const normalized = value.trim()
  if (!PAYMENT_METHODS.includes(normalized as PaymentMethod)) {
    throw new Error(`payment_method must be one of: ${PAYMENT_METHODS.join(", ")}`)
  }

  return normalized as PaymentMethod
}

function normalizePaymentStatus(value: unknown, required: boolean) {
  if (value === undefined && !required) return undefined
  if (typeof value !== "string" || value.trim() === "") {
    if (required) {
      throw new Error(`status must be one of: ${PAYMENT_STATUSES.join(", ")}`)
    }
    return undefined
  }

  const normalized = value.trim()
  if (!PAYMENT_STATUSES.includes(normalized as PaymentStatus)) {
    throw new Error(`status must be one of: ${PAYMENT_STATUSES.join(", ")}`)
  }

  return normalized as PaymentStatus
}

async function fetchPayments(filters?: {
  invoiceId?: string | null
  paymentMethod?: string | null
  status?: string | null
}) {
  let query = `
    SELECT
      p.payment_id,
      p.invoice_id,
      i.invoice_number,
      p.payment_date,
      p.amount,
      p.payment_method,
      p.reference_number,
      p.status,
      p.recorded_by_user_id,
      p.notes,
      p.created_at
    FROM payments p
    INNER JOIN invoices i ON p.invoice_id = i.invoice_id
    WHERE 1 = 1
  `

  const params: Array<string | number> = []

  if (filters?.invoiceId) {
    query += " AND p.invoice_id = ?"
    params.push(Number(filters.invoiceId))
  }

  if (filters?.paymentMethod) {
    query += " AND p.payment_method = ?"
    params.push(filters.paymentMethod)
  }

  if (filters?.status) {
    query += " AND p.status = ?"
    params.push(filters.status)
  }

  query += " ORDER BY p.payment_date DESC, p.payment_id DESC"

  return mysqlQuery<PaymentRow[]>(query, params)
}

async function getInvoiceForPayment(connection: PoolConnection, invoiceId: number) {
  const [rows] = await connection.query<InvoicePaymentRow[]>(
    `
      SELECT invoice_id, invoice_number, total_amount, paid_amount
      FROM invoices
      WHERE invoice_id = ?
    `,
    [invoiceId],
  )

  return rows[0] ?? null
}

function deriveInvoiceStatus(paidAmount: number, totalAmount: number): InvoiceStatus {
  if (paidAmount >= totalAmount) return "Paid"
  if (paidAmount > 0) return "Partial"
  return "Unpaid"
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const invoiceId = searchParams.get("invoice_id")
    const paymentMethod = searchParams.get("payment_method")
    const status = searchParams.get("status")

    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
      return badRequest(
        `payment_method must be one of: ${PAYMENT_METHODS.join(", ")}`,
      )
    }

    if (status && !PAYMENT_STATUSES.includes(status as PaymentStatus)) {
      return badRequest(`status must be one of: ${PAYMENT_STATUSES.join(", ")}`)
    }

    if (invoiceId) {
      normalizePositiveInteger(invoiceId, "invoice_id")
    }

    const rows = await fetchPayments({ invoiceId, paymentMethod, status })
    return NextResponse.json(rows)
  } catch (error: any) {
    console.error("GET /api/confera/payments error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    return NextResponse.json(
      {
        error: "Failed to fetch payments",
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
    const body = (await req.json()) as PaymentPayload
    const invoiceId = normalizePositiveInteger(body.invoice_id, "invoice_id")
    const amount = normalizePositiveNumber(body.amount, "amount")
    const paymentMethod = normalizePaymentMethod(body.payment_method, true)!
    const status = normalizePaymentStatus(body.status, false) ?? "Completed"
    const referenceNumber = normalizeOptionalString(body.reference_number) ?? null
    const recordedByUserId = normalizeOptionalPositiveInteger(
      body.recorded_by_user_id,
      "recorded_by_user_id",
    )
    const notes = normalizeOptionalString(body.notes) ?? null

    await connection.beginTransaction()

    const invoice = await getInvoiceForPayment(connection, invoiceId)
    if (!invoice) {
      await connection.rollback()
      return notFound("Invoice not found")
    }

    const currentPaidAmount = Number(invoice.paid_amount)
    const totalAmount = Number(invoice.total_amount)
    const remainingAmount = Number((totalAmount - currentPaidAmount).toFixed(2))

    if (status === "Completed" && amount > remainingAmount) {
      await connection.rollback()
      return conflict("Payment amount cannot exceed the remaining invoice balance")
    }

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO payments (
          invoice_id,
          payment_date,
          amount,
          payment_method,
          reference_number,
          status,
          recorded_by_user_id,
          notes
        )
        VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
      `,
      [
        invoiceId,
        amount,
        paymentMethod,
        referenceNumber,
        status,
        recordedByUserId,
        notes,
      ],
    )

    if (status === "Completed") {
      const nextPaidAmount = Number((currentPaidAmount + amount).toFixed(2))
      const nextInvoiceStatus = deriveInvoiceStatus(nextPaidAmount, totalAmount)

      await connection.query<ResultSetHeader>(
        `
          UPDATE invoices
          SET paid_amount = ?, invoice_status = ?
          WHERE invoice_id = ?
        `,
        [nextPaidAmount, nextInvoiceStatus, invoiceId],
      )
    }

    await connection.commit()

    const payments = await fetchPayments({ invoiceId: String(invoiceId) })
    const created = payments.find((payment) => payment.payment_id === result.insertId)

    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    try {
      await connection.rollback()
    } catch {}

    console.error("POST /api/confera/payments error:", error)

    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }

    return NextResponse.json(
      {
        error: "Failed to record payment",
        detail: error?.message ?? String(error),
      },
      { status: 500 },
    )
  } finally {
    connection.release()
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as PaymentPayload
    const paymentId = normalizePositiveInteger(body.payment_id, "payment_id")

    if (body.status !== undefined) {
      return badRequest("Updating payment status is not supported in this step")
    }

    const notes =
      body.notes === undefined ? undefined : normalizeOptionalString(body.notes) ?? null

    if (notes === undefined) {
      return badRequest("No supported fields provided for update")
    }

    const pool = getMysqlPool()
    const [result] = await pool.query<ResultSetHeader>(
      `
        UPDATE payments
        SET notes = ?
        WHERE payment_id = ?
      `,
      [notes, paymentId],
    )

    if (result.affectedRows === 0) {
      return notFound("Payment not found")
    }

    const payments = await fetchPayments()
    const updated = payments.find((payment) => payment.payment_id === paymentId)

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("PATCH /api/confera/payments error:", error)
    if (
      error?.message?.includes("required") ||
      error?.message?.includes("must be") ||
      error?.message?.includes("not supported") ||
      error?.message?.includes("No supported")
    ) {
      return badRequest(error.message)
    }
    return NextResponse.json(
      {
        error: "Failed to update payment",
        detail: error?.message ?? String(error),
      },
      { status: 500 },
    )
  }
}
