"use client"

import { useEffect, useState } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ConferaHeader } from "@/components/confera/confera-header"
import { ConferaHallStatuses } from "@/components/confera/confera-hall-statuses"
import { ConferaRecentInvoices } from "@/components/confera/confera-recent-invoices"
import { ConferaPageShell } from "@/components/confera/confera-page-shell"
import { ConferaStaffTasks } from "@/components/confera/confera-staff-tasks"
import { ConferaStatCards } from "@/components/confera/confera-stat-cards"
import type { ConferaDashboardData } from "@/components/confera/confera-types"
import { ConferaUpcomingEvents } from "@/components/confera/confera-upcoming-events"

const emptyDashboardData: ConferaDashboardData = {
  counts: {
    total_active_halls: 0,
    total_active_clients: 0,
    total_confirmed_bookings: 0,
    total_draft_bookings: 0,
    total_completed_bookings: 0,
    total_unpaid_invoices: 0,
    total_partial_invoices: 0,
    total_paid_invoices: 0,
    total_available_equipment: 0,
    total_assigned_equipment: 0,
  },
  upcoming_events: [],
  hall_statuses: [],
  recent_invoices: [],
  staff_tasks: [],
}

async function fetchDashboardData() {
  const response = await fetch("/api/confera/dashboard", {
    method: "GET",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const json = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(json?.error || `Failed to fetch dashboard data (${response.status})`)
  }

  return json as ConferaDashboardData
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 w-full max-w-xl rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <Card className="rounded-xl border-rose-200 bg-white shadow-[0_8px_24px_rgba(15,45,100,0.08)]">
      <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Unable to load the Confera dashboard
          </h2>
          <p className="max-w-xl text-sm leading-6 text-slate-500">{message}</p>
        </div>
        <Button
          onClick={onRetry}
          className="bg-[#1648b8] text-white hover:bg-[#123b98]"
        >
          <RefreshCw className="mr-2 size-4" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}

export function ConferaDashboard() {
  const [data, setData] = useState<ConferaDashboardData>(emptyDashboardData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadDashboard() {
    try {
      setLoading(true)
      setError(null)
      const nextData = await fetchDashboardData()
      setData(nextData)
    } catch (err: any) {
      console.error("Confera dashboard fetch failed:", err)
      setError(err?.message ?? "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
  }, [])

  return (
    <ConferaPageShell activeItem="dashboard">
          {loading ? (
            <DashboardSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={() => void loadDashboard()} />
          ) : (
            <div className="space-y-6">
              <ConferaHeader />
              <ConferaStatCards counts={data.counts} staffTaskCount={data.staff_tasks.length} />

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <ConferaUpcomingEvents items={data.upcoming_events} />
                <ConferaHallStatuses items={data.hall_statuses} />
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <ConferaRecentInvoices items={data.recent_invoices} />
                <ConferaStaffTasks items={data.staff_tasks} />
              </div>
            </div>
          )}
    </ConferaPageShell>
  )
}
