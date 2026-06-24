"use client"

import Image from "next/image"
import Link from "next/link"
import {
  Boxes,
  CalendarDays,
  DoorOpen,
  FileBarChart,
  FileText,
  HandPlatter,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  UserCog,
  Users,
  UsersRound,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { getAllowedConferaPages } from "@/lib/confera-permissions"

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/confera", available: true },
  { id: "event-bookings", label: "Event Bookings", icon: CalendarDays, href: "/confera/event-bookings", available: true },
  { id: "event-halls", label: "Event Halls", icon: DoorOpen, href: "/confera/event-halls", available: true },
  { id: "clients", label: "Clients", icon: UsersRound, href: "/confera/clients", available: true },
  { id: "services", label: "Services", icon: HandPlatter, href: "/confera/services", available: true },
  { id: "equipment", label: "Equipment", icon: Boxes, href: "/confera/equipment", available: true },
  { id: "invoices", label: "Invoices", icon: FileText, href: "/confera/invoices", available: true },
  { id: "staff", label: "Staff", icon: Users, href: "/confera/staff", available: true },
  { id: "reports", label: "Reports", icon: FileBarChart, href: "/confera/reports", available: true },
  { id: "users", label: "Users", icon: UserCog, href: "/confera/users", available: true },
]

function NavigationItems({
  activeItem,
  collapsed = false,
  mobile = false,
  onNavigate,
  allowedItems,
}: {
  activeItem: string
  collapsed?: boolean
  mobile?: boolean
  onNavigate?: () => void
  allowedItems: Set<string>
}) {
  return navigation.filter((item) => allowedItems.has(item.id)).map((item) => {
    const Icon = item.icon
    const content = (
      <>
        <Icon className="size-4 shrink-0" />
        {(!collapsed || mobile) && <span className="whitespace-nowrap">{item.label}</span>}
        {!item.available && !mobile && !collapsed && (
          <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Soon
          </span>
        )}
      </>
    )

    if (item.available && item.href) {
      const isActive = item.id === activeItem
      return (
        <Link
          key={item.label}
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl border font-medium transition-all duration-200",
            isActive
              ? "border-blue-200 bg-[linear-gradient(135deg,#eaf4ff_0%,#f5fbff_100%)] text-[#123b98] shadow-[0_8px_22px_rgba(22,72,184,0.12)]"
              : "border-transparent text-slate-600 hover:border-blue-100 hover:bg-white/70 hover:text-[#1648b8] hover:shadow-sm",
            mobile ? "px-3 py-2 text-xs" : collapsed ? "justify-center px-2 py-2.5 text-sm" : "px-3 py-2.5 text-sm",
          )}
        >
          {content}
        </Link>
      )
    }

    return (
      <div
        key={item.label}
        aria-disabled="true"
        title={`${item.label} page coming soon`}
        className={cn(
          "flex cursor-not-allowed items-center gap-3 rounded-lg border border-transparent text-slate-400 transition-colors hover:bg-slate-100/70",
          mobile ? "px-3 py-2 text-xs" : collapsed ? "justify-center px-2 py-2.5 text-sm" : "px-3 py-2.5 text-sm",
        )}
      >
        {content}
      </div>
    )
  })
}

export function ConferaSidebar({
  activeItem = "dashboard",
  collapsed = false,
  mobileOpen = false,
  onCollapsedChange,
  onMobileOpenChange,
}: {
  activeItem?: string
  collapsed?: boolean
  mobileOpen?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  onMobileOpenChange?: (open: boolean) => void
}) {
  const { user, logout } = useAuth()
  const allowedItems = new Set(user ? getAllowedConferaPages(user.role_name) : [])

  return (
    <>
      <aside className="hidden min-h-screen border-r border-blue-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#f2f8ff_46%,#eaf5ff_100%)] shadow-[8px_0_28px_rgba(15,45,100,0.08)] lg:block">
        <div className={cn("sticky top-0 flex h-screen flex-col transition-[width] duration-200", collapsed ? "w-[72px]" : "w-60")}>
          <div className={cn("flex h-[68px] items-center gap-3 border-b border-blue-100/80 bg-[linear-gradient(135deg,#eef7ff_0%,#ffffff_100%)]", collapsed ? "justify-center px-2" : "px-5")}>
            <Image
              src="/confera/logo%203.png"
              alt="Confera"
              width={36}
              height={36}
              className="size-9 rounded-xl object-contain shadow-sm"
              priority
            />
            <div className={cn("min-w-0", collapsed && "hidden")}>
              <p className="font-semibold leading-5 text-[#0b2d6b]">Confera</p>
              <p className="truncate text-xs text-slate-500">Event Management System</p>
            </div>
            <button
              type="button"
              onClick={() => onCollapsedChange?.(!collapsed)}
              className={cn("flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-blue-700 hover:shadow-sm", collapsed ? "absolute left-5 top-[76px]" : "ml-auto")}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          </div>

          <nav className={cn("flex-1 space-y-1.5 px-3", collapsed ? "py-14" : "py-5")} aria-label="Confera navigation">
            <NavigationItems activeItem={activeItem} collapsed={collapsed} allowedItems={allowedItems} />
          </nav>

          <div className={cn("border-t border-blue-100/80 bg-white/55 px-3 py-3 backdrop-blur", collapsed && "flex justify-center px-2")}>
            {!collapsed && <div className="min-w-0"><p className="truncate text-xs font-medium text-slate-700">{user?.full_name}</p><p className="mt-0.5 truncate text-xs text-slate-400">{user?.role_name}</p></div>}
            <button type="button" onClick={() => void logout()} className={cn("flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600", !collapsed && "ml-auto -mt-8")} aria-label="Logout" title="Logout"><LogOut className="size-4" /></button>
          </div>
        </div>
      </aside>

      <div className="border-b border-blue-100/80 bg-white/90 shadow-sm backdrop-blur lg:hidden">
        <div className="flex h-16 items-center gap-3 bg-[linear-gradient(135deg,#eef7ff_0%,#ffffff_100%)] px-4">
          <Image
            src="/confera/logo%203.png"
            alt="Confera"
            width={34}
            height={34}
            className="size-8 rounded-lg object-contain shadow-sm"
            priority
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">Confera</p>
            <p className="text-xs text-slate-500">Event Management System</p>
          </div>
          <button type="button" onClick={() => onMobileOpenChange?.(!mobileOpen)} className="ml-auto flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-blue-700 hover:shadow-sm" aria-label={mobileOpen ? "Close navigation" : "Open navigation"}>
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {mobileOpen && (
          <nav className="grid grid-cols-2 gap-1 border-t border-blue-100 bg-blue-50/35 px-3 py-3 sm:grid-cols-3" aria-label="Confera mobile navigation">
            <NavigationItems activeItem={activeItem} mobile allowedItems={allowedItems} onNavigate={() => onMobileOpenChange?.(false)} />
          </nav>
        )}
        <div className="flex items-center justify-between border-t border-blue-100 px-4 py-2 text-xs text-slate-500 lg:hidden"><span>{user?.full_name} - {user?.role_name}</span><button type="button" onClick={() => void logout()} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-rose-600 hover:bg-rose-50"><LogOut className="size-3.5" />Logout</button></div>
      </div>
    </>
  )
}
