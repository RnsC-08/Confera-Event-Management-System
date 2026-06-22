import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getConferaSession, hashConferaPassword } from "@/lib/confera-auth"
import { getMysqlPool, mysqlQuery } from "@/lib/mysql-db"

type UserRow = RowDataPacket & {
  user_id: number
  role_id: number
  full_name: string
  email: string
  role_name: string
  is_active: number
  created_at: string
}

type RoleRow = RowDataPacket & { role_id: number }

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

async function requireAdministrator() {
  const session = await getConferaSession()
  return session?.role_name === "Administrator" ? session : null
}

function validEmail(value: unknown) {
  if (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    throw new Error("A valid email is required")
  }
  return value.trim().toLowerCase()
}

function requiredName(value: unknown) {
  if (typeof value !== "string" || !value.trim()) throw new Error("full_name is required")
  return value.trim()
}

function booleanNumber(value: unknown) {
  if (typeof value === "boolean") return value ? 1 : 0
  if (value === 1 || value === 0) return value
  throw new Error("is_active must be a boolean")
}

function positiveId(value: unknown, field: string) {
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${field} is required`)
  return parsed
}

async function ensureActiveRole(roleId: number) {
  const rows = await mysqlQuery<RoleRow[]>(
    "SELECT role_id FROM roles WHERE role_id = ? AND is_active = 1 LIMIT 1",
    [roleId],
  )
  if (rows.length === 0) throw new Error("A valid active role_id is required")
}

async function fetchUser(userId: number) {
  const rows = await mysqlQuery<UserRow[]>(
    `
      SELECT u.user_id, u.role_id, u.full_name, u.email, r.name AS role_name,
             u.is_active, u.created_at
      FROM users u
      INNER JOIN roles r ON u.role_id = r.role_id
      WHERE u.user_id = ?
    `,
    [userId],
  )
  return rows[0] ?? null
}

export async function GET() {
  try {
    const session = await getConferaSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const admin = session.role_name === "Administrator"
    const users = await mysqlQuery<UserRow[]>(
      `
        SELECT u.user_id, u.role_id, u.full_name, u.email, r.name AS role_name,
               u.is_active, u.created_at
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        ${admin ? "" : "WHERE u.is_active = 1"}
        ORDER BY u.full_name ASC
      `,
    )
    return NextResponse.json(users)
  } catch (error: any) {
    console.error("GET /api/confera/users error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await requireAdministrator())) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const body = await req.json()
    const fullName = requiredName(body.full_name)
    const email = validEmail(body.email)
    const roleId = positiveId(body.role_id, "role_id")
    const password = typeof body.password === "string" ? body.password : ""
    if (password.length < 8) return badRequest("Password must be at least 8 characters")
    await ensureActiveRole(roleId)
    const passwordHash = await hashConferaPassword(password)
    const isActive = body.is_active === undefined ? 1 : booleanNumber(body.is_active)
    const username = `user.${Date.now()}.${crypto.randomBytes(3).toString("hex")}`
    const pool = getMysqlPool()
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (role_id, username, password_hash, full_name, email, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [roleId, username, passwordHash, fullName, email, isActive],
    )
    return NextResponse.json(await fetchUser(result.insertId), { status: 201 })
  } catch (error: any) {
    console.error("POST /api/confera/users error:", error)
    if (error?.code === "ER_DUP_ENTRY") return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
    if (error?.message?.includes("required") || error?.message?.includes("boolean")) return badRequest(error.message)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await requireAdministrator())) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const body = await req.json()
    const userId = positiveId(body.user_id, "user_id")
    if (!(await fetchUser(userId))) return NextResponse.json({ error: "User not found" }, { status: 404 })
    const updates: string[] = []
    const values: Array<string | number> = []

    if (body.full_name !== undefined) { updates.push("full_name = ?"); values.push(requiredName(body.full_name)) }
    if (body.email !== undefined) { updates.push("email = ?"); values.push(validEmail(body.email)) }
    if (body.role_id !== undefined) { const roleId = positiveId(body.role_id, "role_id"); await ensureActiveRole(roleId); updates.push("role_id = ?"); values.push(roleId) }
    if (body.is_active !== undefined) { updates.push("is_active = ?"); values.push(booleanNumber(body.is_active)) }
    if (body.new_password !== undefined) {
      if (typeof body.new_password !== "string" || body.new_password.length < 8) return badRequest("Password must be at least 8 characters")
      updates.push("password_hash = ?")
      values.push(await hashConferaPassword(body.new_password))
    }
    if (updates.length === 0) return badRequest("No supported fields provided for update")

    const pool = getMysqlPool()
    await pool.query<ResultSetHeader>(`UPDATE users SET ${updates.join(", ")} WHERE user_id = ?`, [...values, userId])
    return NextResponse.json(await fetchUser(userId))
  } catch (error: any) {
    console.error("PATCH /api/confera/users error:", error)
    if (error?.code === "ER_DUP_ENTRY") return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
    if (error?.message?.includes("required") || error?.message?.includes("boolean")) return badRequest(error.message)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
