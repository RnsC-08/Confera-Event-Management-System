import mysql, { type Pool, type PoolOptions, type RowDataPacket } from "mysql2/promise"

type QueryParams = Array<string | number | boolean | Date | null>

declare global {
  // Reuse the pool during local development hot reloads.
  // eslint-disable-next-line no-var
  var __mysqlPool: Pool | undefined
}

function getRequiredEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value || value.trim() === "") {
    throw new Error(`Missing required MySQL environment variable: ${name}`)
  }
  return value
}

function buildPoolConfig(): PoolOptions {
  const portValue = process.env.MYSQL_PORT ?? "3306"
  const port = Number.parseInt(portValue, 10)

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid MYSQL_PORT value: ${portValue}`)
  }

  return {
    host: getRequiredEnv("MYSQL_HOST", "localhost"),
    port,
    user: getRequiredEnv("MYSQL_USER"),
    password: process.env.MYSQL_PASSWORD ?? "",
    database: getRequiredEnv("MYSQL_DATABASE"),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  }
}

export function getMysqlPool(): Pool {
  if (global.__mysqlPool) {
    return global.__mysqlPool
  }

  const pool = mysql.createPool(buildPoolConfig())
  global.__mysqlPool = pool
  return pool
}

export async function mysqlQuery<T extends RowDataPacket[] = RowDataPacket[]>(
  sql: string,
  params: QueryParams = [],
): Promise<T> {
  try {
    const pool = getMysqlPool()
    const [rows] = await pool.query<T>(sql, params)
    return rows
  } catch (error) {
    console.error("MySQL query failed:", error)
    throw error
  }
}

export async function testMysqlConnection() {
  try {
    const pool = getMysqlPool()
    const connection = await pool.getConnection()
    try {
      await connection.ping()
    } finally {
      connection.release()
    }
  } catch (error: any) {
    const detail = error?.message ?? String(error)
    throw new Error(`Unable to connect to MySQL: ${detail}`)
  }
}
