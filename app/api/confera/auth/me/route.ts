import { NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { getConferaSession } from "@/lib/confera-auth"
import { isConferaRole } from "@/lib/confera-permissions"
import { mysqlQuery } from "@/lib/mysql-db"

type CurrentUserRow = RowDataPacket & {
  user_id: number
  full_name: string
  email: string
  role_name: string
}

export async function GET() {
  const session = await getConferaSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await mysqlQuery<CurrentUserRow[]>(
    `
      SELECT u.user_id, u.full_name, u.email, r.name AS role_name
      FROM users u
      INNER JOIN roles r ON u.role_id = r.role_id
      WHERE u.user_id = ? AND u.is_active = 1 AND r.is_active = 1
      LIMIT 1
    `,
    [session.user_id],
  )
  const user = rows[0]
  if (!user || !isConferaRole(user.role_name)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ user })
}
