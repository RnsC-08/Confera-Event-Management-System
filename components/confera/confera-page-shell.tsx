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
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="size-6 animate-spin text-blue-700" /></div>
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#f7faff_0%,#f1f6fc_48%,#eef4fa_100%)] text-slate-900">
      <div
        className={
          collapsed
            ? "lg:grid lg:grid-cols-[72px_minmax(0,1fr)]"
            : "lg:grid lg:grid-cols-[240px_minmax(0,1fr)]"
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
