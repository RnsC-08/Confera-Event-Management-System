import { Eye, ShieldCheck } from "lucide-react"

export function ConferaAccessNotice({ limited = false }: { limited?: boolean }) {
  const Icon = limited ? ShieldCheck : Eye

  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
      <Icon className="mt-0.5 size-4 shrink-0 text-blue-700" />
      <div>
        <p className="font-medium">{limited ? "Operational access" : "Read-only access"}</p>
        <p className="mt-0.5 text-xs leading-5 text-blue-700">
          {limited
            ? "You can update task status and notes, but assignment details are managed by coordinators or administrators."
            : "Your role can view this information, but cannot create or edit records on this page."}
        </p>
      </div>
    </div>
  )
}
