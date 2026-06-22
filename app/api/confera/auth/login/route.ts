import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { createConferaSession, CONFERA_SESSION_COOKIE, verifyConferaPassword } from "@/lib/confera-auth"
import { isConferaRole } from "@/lib/confera-permissions"
import { mysqlQuery } from "@/lib/mysql-db"

type LoginUserRow = RowDataPacket & {
  user_id: number
  full_name: string
  email: string
  password_hash: string
  role_name: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const rows = await mysqlQuery<LoginUserRow[]>(
      `
        SELECT u.user_id, u.full_name, u.email, u.password_hash, r.name AS role_name
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE LOWER(u.email) = ? AND u.is_active = 1 AND r.is_active = 1
        LIMIT 1
      `,
      [email],
    )
    const user = rows[0]
    if (!user || !isConferaRole(user.role_name) || !(await verifyConferaPassword(password, user.password_hash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const sessionUser = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role_name: user.role_name,
    }
    const token = await createConferaSession(sessionUser)
    await mysqlQuery("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?", [user.user_id])

    const response = NextResponse.json({ user: sessionUser })
    response.cookies.set(CONFERA_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    })
    return response
  } catch (error: any) {
    console.error("POST /api/confera/auth/login error:", error)
    return NextResponse.json({ error: "Unable to sign in. Please try again." }, { status: 500 })
  }
}
