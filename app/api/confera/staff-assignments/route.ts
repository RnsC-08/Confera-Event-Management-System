import { NextRequest, NextResponse } from "next/server"
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getMysqlPool, mysqlQuery } from "@/lib/mysql-db"
import { getConferaSession } from "@/lib/confera-auth"

const ASSIGNMENT_STATUSES = ["Assigned", "InProgress", "Completed", "Cancelled"] as const
type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]

type StaffAssignmentRow = RowDataPacket & {
  staff_assignment_id: number
  event_booking_id: number
  booking_reference: string
  event_title: string | null
  user_id: number
  staff_name: string
  role_name: string
  assignment_role: string
  task_description: string | null
  assignment_status: AssignmentStatus
  assigned_at: string
  completed_at: string | null
  notes: string | null
}

type UserRow = RowDataPacket & {
  user_id: number
  is_active: number
}

type ExistsRow = RowDataPacket & {
  id: number
}

type DuplicateRow = RowDataPacket & {
  staff_assignment_id: number
}

type ExistingAssignmentRow = RowDataPacket & {
  staff_assignment_id: number
  assignment_status: AssignmentStatus
  completed_at: string | null
}

type StaffAssignmentPayload = {
  staff_assignment_id?: unknown
  event_booking_id?: unknown
  user_id?: unknown
  assignment_role?: unknown
  task_description?: unknown
  assignment_status?: unknown
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

function normalizeAssignmentStatus(value: unknown, required: boolean) {
  if (value === undefined && !required) return undefined
  if (typeof value !== "string" || value.trim() === "") {
    if (required) {
      throw new Error(
        `assignment_status must be one of: ${ASSIGNMENT_STATUSES.join(", ")}`,
      )
    }
    return undefined
  }

  const normalized = value.trim()
  if (!ASSIGNMENT_STATUSES.includes(normalized as AssignmentStatus)) {
    throw new Error(
      `assignment_status must be one of: ${ASSIGNMENT_STATUSES.join(", ")}`,
    )
  }

  return normalized as AssignmentStatus
}

async function fetchAssignments(filters?: {
  eventBookingId?: string | null
  userId?: string | null
  assignmentStatus?: string | null
}) {
  let query = `
    SELECT
      sa.staff_assignment_id,
      sa.event_booking_id,
      eb.booking_reference,
      e.title AS event_title,
      sa.user_id,
      u.full_name AS staff_name,
      r.name AS role_name,
      sa.assignment_role,
      sa.task_description,
      sa.assignment_status,
      sa.assigned_at,
      sa.completed_at,
      sa.notes
    FROM staff_assignments sa
    INNER JOIN event_bookings eb ON sa.event_booking_id = eb.event_booking_id
    LEFT JOIN events e ON eb.event_id = e.event_id
    INNER JOIN users u ON sa.user_id = u.user_id
    INNER JOIN roles r ON u.role_id = r.role_id
    WHERE 1 = 1
  `

  const params: Array<string | number> = []

  if (filters?.eventBookingId) {
    query += " AND sa.event_booking_id = ?"
    params.push(Number(filters.eventBookingId))
  }

  if (filters?.userId) {
    query += " AND sa.user_id = ?"
    params.push(Number(filters.userId))
  }

  if (filters?.assignmentStatus) {
    query += " AND sa.assignment_status = ?"
    params.push(filters.assignmentStatus)
  }

  query += " ORDER BY sa.assigned_at DESC, sa.staff_assignment_id DESC"

  return mysqlQuery<StaffAssignmentRow[]>(query, params)
}

async function ensureBookingExists(connection: PoolConnection, eventBookingId: number) {
  const [rows] = await connection.query<ExistsRow[]>(
    "SELECT event_booking_id AS id FROM event_bookings WHERE event_booking_id = ?",
    [eventBookingId],
  )

  return rows.length > 0
}

async function getActiveUser(connection: PoolConnection, userId: number) {
  const [rows] = await connection.query<UserRow[]>(
    "SELECT user_id, is_active FROM users WHERE user_id = ?",
    [userId],
  )

  return rows[0] ?? null
}

async function findDuplicateAssignment(
  connection: PoolConnection,
  input: {
    eventBookingId: number
    userId: number
    assignmentRole: string
    excludeStaffAssignmentId?: number
  },
) {
  const params: Array<string | number> = [
    input.eventBookingId,
    input.userId,
    input.assignmentRole,
  ]

  let query = `
    SELECT staff_assignment_id
    FROM staff_assignments
    WHERE event_booking_id = ?
      AND user_id = ?
      AND assignment_role = ?
  `

  if (input.excludeStaffAssignmentId) {
    query += " AND staff_assignment_id <> ?"
    params.push(input.excludeStaffAssignmentId)
  }

  query += " LIMIT 1"

  const [rows] = await connection.query<DuplicateRow[]>(query, params)
  return rows[0] ?? null
}

async function getExistingAssignment(
  connection: PoolConnection,
  staffAssignmentId: number,
) {
  const [rows] = await connection.query<ExistingAssignmentRow[]>(
    `
      SELECT staff_assignment_id, assignment_status, completed_at
      FROM staff_assignments
      WHERE staff_assignment_id = ?
    `,
    [staffAssignmentId],
  )

  return rows[0] ?? null
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventBookingId = searchParams.get("event_booking_id")
    const userId = searchParams.get("user_id")
    const assignmentStatus = searchParams.get("assignment_status")

    if (
      assignmentStatus &&
      !ASSIGNMENT_STATUSES.includes(assignmentStatus as AssignmentStatus)
    ) {
      return badRequest(
        `assignment_status must be one of: ${ASSIGNMENT_STATUSES.join(", ")}`,
      )
    }

    if (eventBookingId) {
      normalizePositiveInteger(eventBookingId, "event_booking_id")
    }

    if (userId) {
      normalizePositiveInteger(userId, "user_id")
    }

    const rows = await fetchAssignments({ eventBookingId, userId, assignmentStatus })
    return NextResponse.json(rows)
  } catch (error: any) {
    console.error("GET /api/confera/staff-assignments error:", error)
    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }
    return NextResponse.json(
      {
        error: "Failed to fetch staff assignments",
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
    const session = await getConferaSession()
    if (session?.role_name === "Operational Staff") {
      return NextResponse.json({ error: "Operational Staff cannot create staff assignments" }, { status: 403 })
    }
    const body = (await req.json()) as StaffAssignmentPayload
    const eventBookingId = normalizePositiveInteger(
      body.event_booking_id,
      "event_booking_id",
    )
    const userId = normalizePositiveInteger(body.user_id, "user_id")
    const assignmentRole = normalizeRequiredString(
      body.assignment_role,
      "assignment_role",
    )
    const taskDescription = normalizeOptionalString(body.task_description) ?? null
    const assignmentStatus =
      normalizeAssignmentStatus(body.assignment_status, false) ?? "Assigned"
    const notes = normalizeOptionalString(body.notes) ?? null

    await connection.beginTransaction()

    const bookingExists = await ensureBookingExists(connection, eventBookingId)
    if (!bookingExists) {
      await connection.rollback()
      return notFound("Event booking not found")
    }

    const user = await getActiveUser(connection, userId)
    if (!user) {
      await connection.rollback()
      return notFound("User not found")
    }
    if (user.is_active !== 1) {
      await connection.rollback()
      return badRequest("User must be active")
    }

    const duplicate = await findDuplicateAssignment(connection, {
      eventBookingId,
      userId,
      assignmentRole,
    })

    if (duplicate) {
      await connection.rollback()
      return conflict("This staff assignment already exists for the booking")
    }

    const completedAt =
      assignmentStatus === "Completed" ? new Date() : null

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO staff_assignments (
          event_booking_id,
          user_id,
          assignment_role,
          task_description,
          assignment_status,
          completed_at,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        eventBookingId,
        userId,
        assignmentRole,
        taskDescription,
        assignmentStatus,
        completedAt,
        notes,
      ],
    )

    await connection.commit()

    const rows = await mysqlQuery<StaffAssignmentRow[]>(
      `
        SELECT
          sa.staff_assignment_id,
          sa.event_booking_id,
          eb.booking_reference,
          e.title AS event_title,
          sa.user_id,
          u.full_name AS staff_name,
          r.name AS role_name,
          sa.assignment_role,
          sa.task_description,
          sa.assignment_status,
          sa.assigned_at,
          sa.completed_at,
          sa.notes
        FROM staff_assignments sa
        INNER JOIN event_bookings eb ON sa.event_booking_id = eb.event_booking_id
        LEFT JOIN events e ON eb.event_id = e.event_id
        INNER JOIN users u ON sa.user_id = u.user_id
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE sa.staff_assignment_id = ?
      `,
      [result.insertId],
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (error: any) {
    try {
      await connection.rollback()
    } catch {}

    console.error("POST /api/confera/staff-assignments error:", error)

    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }

    if (error?.code === "ER_DUP_ENTRY") {
      return conflict("This staff assignment already exists for the booking")
    }

    return NextResponse.json(
      {
        error: "Failed to create staff assignment",
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
    const body = (await req.json()) as StaffAssignmentPayload
    const session = await getConferaSession()
    if (
      session?.role_name === "Operational Staff" &&
      (body.assignment_role !== undefined || body.task_description !== undefined)
    ) {
      return NextResponse.json(
        { error: "Operational Staff can update only task status and notes" },
        { status: 403 },
      )
    }
    const staffAssignmentId = normalizePositiveInteger(
      body.staff_assignment_id,
      "staff_assignment_id",
    )

    await connection.beginTransaction()

    const existing = await getExistingAssignment(connection, staffAssignmentId)
    if (!existing) {
      await connection.rollback()
      return notFound("Staff assignment not found")
    }

    const [contextRows] = await connection.query<
      (RowDataPacket & {
        event_booking_id: number
        user_id: number
        assignment_role: string
      })[]
    >(
      `
        SELECT event_booking_id, user_id, assignment_role
        FROM staff_assignments
        WHERE staff_assignment_id = ?
      `,
      [staffAssignmentId],
    )

    const context = contextRows[0]
    const nextAssignmentRole =
      body.assignment_role === undefined
        ? context.assignment_role
        : normalizeRequiredString(body.assignment_role, "assignment_role")

    const nextTaskDescription =
      body.task_description === undefined
        ? undefined
        : normalizeOptionalString(body.task_description) ?? null

    const nextAssignmentStatus =
      body.assignment_status === undefined
        ? undefined
        : normalizeAssignmentStatus(body.assignment_status, true)!

    const nextNotes =
      body.notes === undefined ? undefined : normalizeOptionalString(body.notes) ?? null

    const duplicate = await findDuplicateAssignment(connection, {
      eventBookingId: context.event_booking_id,
      userId: context.user_id,
      assignmentRole: nextAssignmentRole,
      excludeStaffAssignmentId: staffAssignmentId,
    })

    if (duplicate) {
      await connection.rollback()
      return conflict("This staff assignment already exists for the booking")
    }

    const updates: string[] = []
    const values: Array<string | Date | null> = []

    if (body.assignment_role !== undefined) {
      updates.push("assignment_role = ?")
      values.push(nextAssignmentRole)
    }

    if (body.task_description !== undefined) {
      updates.push("task_description = ?")
      values.push(nextTaskDescription ?? null)
    }

    if (body.assignment_status !== undefined) {
      updates.push("assignment_status = ?")
      values.push(nextAssignmentStatus!)

      if (
        nextAssignmentStatus === "Completed" &&
        existing.assignment_status !== "Completed" &&
        existing.completed_at === null
      ) {
        updates.push("completed_at = ?")
        values.push(new Date())
      }
    }

    if (body.notes !== undefined) {
      updates.push("notes = ?")
      values.push(nextNotes ?? null)
    }

    if (updates.length === 0) {
      await connection.rollback()
      return badRequest("No fields provided for update")
    }

    const [result] = await connection.query<ResultSetHeader>(
      `
        UPDATE staff_assignments
        SET ${updates.join(", ")}
        WHERE staff_assignment_id = ?
      `,
      [...values, staffAssignmentId],
    )

    if (result.affectedRows === 0) {
      await connection.rollback()
      return notFound("Staff assignment not found")
    }

    await connection.commit()

    const rows = await mysqlQuery<StaffAssignmentRow[]>(
      `
        SELECT
          sa.staff_assignment_id,
          sa.event_booking_id,
          eb.booking_reference,
          e.title AS event_title,
          sa.user_id,
          u.full_name AS staff_name,
          r.name AS role_name,
          sa.assignment_role,
          sa.task_description,
          sa.assignment_status,
          sa.assigned_at,
          sa.completed_at,
          sa.notes
        FROM staff_assignments sa
        INNER JOIN event_bookings eb ON sa.event_booking_id = eb.event_booking_id
        LEFT JOIN events e ON eb.event_id = e.event_id
        INNER JOIN users u ON sa.user_id = u.user_id
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE sa.staff_assignment_id = ?
      `,
      [staffAssignmentId],
    )

    return NextResponse.json(rows[0])
  } catch (error: any) {
    try {
      await connection.rollback()
    } catch {}

    console.error("PATCH /api/confera/staff-assignments error:", error)

    if (error?.message?.includes("required") || error?.message?.includes("must be")) {
      return badRequest(error.message)
    }

    return NextResponse.json(
      {
        error: "Failed to update staff assignment",
        detail: error?.message ?? String(error),
      },
      { status: 500 },
    )
  } finally {
    connection.release()
  }
}
