import { NextResponse } from "next/server"
import { CONFERA_SESSION_COOKIE } from "@/lib/confera-auth"

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(CONFERA_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  return response
}
