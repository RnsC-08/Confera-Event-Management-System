import { NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { getConferaSession } from "@/lib/confera-auth"
import { mysqlQuery } from "@/lib/mysql-db"

type RoleRow = RowDataPacket & {
  role_id: number
  name: string
  description: string | null
}

export async function GET() {
  const session = await getConferaSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role_name !== "Administrator") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  try {
    const roles = await mysqlQuery<RoleRow[]>(
      "SELECT role_id, name, description FROM roles WHERE is_active = 1 ORDER BY role_id ASC",
    )
    return NextResponse.json(roles)
  } catch (error) {
    console.error("GET /api/confera/roles error:", error)
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 })
  }
}
