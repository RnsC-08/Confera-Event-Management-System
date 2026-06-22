import { NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { mysqlQuery, testMysqlConnection } from "@/lib/mysql-db"

type OkRow = RowDataPacket & {
  ok: number
}

type RolesCountRow = RowDataPacket & {
  roles_count: number
}

export async function GET() {
  try {
    await testMysqlConnection()

    const okRows = await mysqlQuery<OkRow[]>("SELECT 1 AS ok")
    const roleRows = await mysqlQuery<RolesCountRow[]>(
      "SELECT COUNT(*) AS roles_count FROM roles",
    )

    return NextResponse.json({
      success: true,
      database: process.env.MYSQL_DATABASE ?? null,
      checks: {
        ping: okRows[0]?.ok === 1,
        roles_count: roleRows[0]?.roles_count ?? 0,
      },
    })
  } catch (error: any) {
    console.error("GET /api/mysql-health error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "MySQL health check failed",
        detail: error?.message ?? String(error),
      },
      { status: 500 },
    )
  }
}
