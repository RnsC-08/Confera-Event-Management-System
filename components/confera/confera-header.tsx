import { CalendarDays } from "lucide-react"

export function ConferaHeader() {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date())

  return (
    <header className="flex flex-col gap-3 rounded-2xl border border-blue-100/90 bg-white/72 p-5 shadow-[0_14px_34px_rgba(15,45,100,0.10)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of bookings, halls, invoices, equipment, and staff tasks.
        </p>
      </div>
      <div className="flex w-fit items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
        <CalendarDays className="size-4 text-[#1648b8]" />
        <span>{today}</span>
      </div>
    </header>
  )
}
