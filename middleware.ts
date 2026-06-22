import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import type { ConferaPageId, ConferaRole } from "@/lib/confera-permissions"
import { canAccessConferaPage, canUseConferaApi, isConferaRole } from "@/lib/confera-permissions"

const secret = new TextEncoder().encode(
  process.env.CONFERA_AUTH_SECRET || process.env.AUTH_SECRET || "confera-dev-secret-change-in-production",
)

const OLD_PUBLIC_PATHS = [
  "/api/mysql-health", "/hotel", "/login",
]

const CONFERA_AUTH_PATHS = [
  "/api/confera/auth/login",
  "/api/confera/auth/logout",
  "/api/confera/auth/me",
]

function pageFromPath(pathname: string): ConferaPageId {
  const segment = pathname.split("/")[2]
  if (!segment) return "dashboard"
  return segment as ConferaPageId
}

function apiResource(pathname: string) {
  return pathname.split("/")[3] || ""
}

async function readConferaRole(req: NextRequest) {
  const token = req.cookies.get("confera_session")?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: "confera" })
    return isConferaRole(payload.role_name) ? payload.role_name : null
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/confera/logo") ||
    OLD_PUBLIC_PATHS.some((path) => pathname.startsWith(path)) ||
    CONFERA_AUTH_PATHS.includes(pathname)
  ) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/confera/")) {
    const role = await readConferaRole(req)
    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!canUseConferaApi(role, apiResource(pathname), req.method)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.next()
  }

  if (pathname === "/confera" || pathname.startsWith("/confera/")) {
    const role = await readConferaRole(req)
    if (!role) return NextResponse.redirect(new URL("/login", req.url))
    const page = pageFromPath(pathname)
    if (!canAccessConferaPage(role, page)) {
      return NextResponse.redirect(new URL("/confera", req.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/:path*", "/hotel/:path*", "/confera/:path*"],
}
