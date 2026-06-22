import crypto from "crypto"
import { cookies } from "next/headers"
import { jwtVerify, SignJWT } from "jose"
import type { ConferaRole } from "@/lib/confera-permissions"

function scryptPassword(
  password: string,
  salt: string,
  keyLength: number,
  options: crypto.ScryptOptions,
) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, options, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}
const secret = new TextEncoder().encode(
  process.env.CONFERA_AUTH_SECRET || process.env.AUTH_SECRET || "confera-dev-secret-change-in-production",
)

export const CONFERA_SESSION_COOKIE = "confera_session"

export type ConferaSession = {
  user_id: number
  full_name: string
  email: string
  role_name: ConferaRole
}

export async function createConferaSession(user: ConferaSession) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .setIssuer("confera")
    .sign(secret)
}

export async function verifyConferaToken(token: string): Promise<ConferaSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: "confera" })
    return payload as unknown as ConferaSession
  } catch {
    return null
  }
}

export async function getConferaSession() {
  const token = (await cookies()).get(CONFERA_SESSION_COOKIE)?.value
  return token ? verifyConferaToken(token) : null
}

export async function hashConferaPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex")
  const key = await scryptPassword(password, salt, 64, { N: 16384, r: 8, p: 1 })
  return `scrypt$16384$8$1$${salt}$${key.toString("hex")}`
}

export async function verifyConferaPassword(password: string, storedHash: string) {
  const parts = storedHash.split("$")
  if (parts.length !== 6 || parts[0] !== "scrypt") return false
  const [, n, r, p, salt, expectedHex] = parts
  try {
    const actual = await scryptPassword(password, salt, expectedHex.length / 2, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })
    const expected = Buffer.from(expectedHex, "hex")
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
