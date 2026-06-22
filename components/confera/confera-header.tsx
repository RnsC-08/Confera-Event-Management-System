import { CalendarDays } from "lucide-react"

export function ConferaHeader() {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date())

  return (
    <header className="flex flex-col gap-3 border-b border-blue-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of bookings, halls, invoices, equipment, and staff tasks.
        </p>
      </div>
      <div className="flex w-fit items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
        <CalendarDays className="size-4 text-[#1648b8]" />
        <span>{today}</span>
      </div>
    </header>
  )
}
