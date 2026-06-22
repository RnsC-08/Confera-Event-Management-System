"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ConferaRole } from "@/lib/confera-permissions"

export type AuthUser = {
  user_id: number
  full_name: string
  email: string
  role_name: ConferaRole
  id: number
  username: string
  role: ConferaRole
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => ({}),
  logout: async () => {},
  refreshUser: async () => {},
})

function normalizeUser(user: Omit<AuthUser, "id" | "username" | "role">): AuthUser {
  return { ...user, id: user.user_id, username: user.full_name, role: user.role_name }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch("/api/confera/auth/me", { cache: "no-store" })
      if (!response.ok) return setUser(null)
      const data = await response.json()
      setUser(normalizeUser(data.user))
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    void refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch("/api/confera/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return { error: data.error || "Login failed" }
    setUser(normalizeUser(data.user))
    return {}
  }, [])

  const logout = useCallback(async () => {
    await fetch("/api/confera/auth/logout", { method: "POST" })
    setUser(null)
    window.location.href = "/login"
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
