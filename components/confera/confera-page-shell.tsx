"use client"

import { ReactNode, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ConferaSidebar } from "@/components/confera/confera-sidebar"
import { useAuth } from "@/lib/auth-context"
import type { ConferaPageId } from "@/lib/confera-permissions"
import { canAccessConferaPage } from "@/lib/confera-permissions"

export function ConferaPageShell({
  activeItem,
  children,
}: {
  activeItem: ConferaPageId
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
    else if (!loading && user && !canAccessConferaPage(user.role_name, activeItem)) router.replace("/confera")
  }, [activeItem, loading, router, user])

  if (loading || !user || !canAccessConferaPage(user.role_name, activeItem)) {
    return <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f8fbff_0%,#eaf6ff_48%,#eefcff_100%)]"><Loader2 className="size-6 animate-spin text-blue-700" /></div>
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f8fbff_0%,#edf7ff_44%,#eefcff_100%)] text-slate-900">
      <div className="pointer-events-none fixed -left-36 top-24 size-96 rounded-full bg-cyan-200/30 blur-3xl" />
      <div className="pointer-events-none fixed -right-40 bottom-10 size-[28rem] rounded-full bg-blue-300/25 blur-3xl" />
      <div className="pointer-events-none fixed left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 blur-3xl" />
      <div
        className={
          collapsed
            ? "relative z-10 lg:grid lg:grid-cols-[72px_minmax(0,1fr)]"
            : "relative z-10 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]"
        }
      >
        <ConferaSidebar
          activeItem={activeItem}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCollapsedChange={setCollapsed}
          onMobileOpenChange={setMobileOpen}
        />
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
