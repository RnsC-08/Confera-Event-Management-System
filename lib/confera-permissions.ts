export const CONFERA_ROLES = ["Administrator", "Event Coordinator", "Operational Staff"] as const
export type ConferaRole = (typeof CONFERA_ROLES)[number]

export type ConferaPageId = "dashboard" | "event-bookings" | "event-halls" | "clients" | "services" | "equipment" | "invoices" | "staff" | "reports" | "users"
export type PageAccessMode = "manage" | "read"
export type ConferaAction =
  | "bookings:create" | "bookings:update"
  | "halls:create" | "halls:update"
  | "clients:manage" | "services:manage"
  | "equipment:create" | "equipment:update"
  | "billing:manage"
  | "staff:create" | "staff:update"
  | "users:manage"

type RoleAccess = {
  pages: Partial<Record<ConferaPageId, PageAccessMode>>
  actions: ConferaAction[]
}

const administratorActions: ConferaAction[] = [
  "bookings:create", "bookings:update", "halls:create", "halls:update",
  "clients:manage", "services:manage", "equipment:create", "equipment:update",
  "billing:manage", "staff:create", "staff:update", "users:manage",
]

export const CONFERA_ROLE_ACCESS: Record<ConferaRole, RoleAccess> = {
  Administrator: {
    pages: { dashboard: "manage", "event-bookings": "manage", "event-halls": "manage", clients: "manage", services: "manage", equipment: "manage", invoices: "manage", staff: "manage", reports: "read", users: "manage" },
    actions: administratorActions,
  },
  "Event Coordinator": {
    pages: { dashboard: "read", "event-bookings": "manage", "event-halls": "read", clients: "manage", services: "read", equipment: "read", invoices: "manage", staff: "manage", reports: "read" },
    actions: ["bookings:create", "bookings:update", "clients:manage", "billing:manage", "staff:create", "staff:update"],
  },
  "Operational Staff": {
    pages: { dashboard: "read", "event-bookings": "read", "event-halls": "read", equipment: "manage", staff: "manage", reports: "read" },
    actions: ["equipment:update", "staff:update"],
  },
}

export function isConferaRole(value: unknown): value is ConferaRole {
  return typeof value === "string" && CONFERA_ROLES.includes(value as ConferaRole)
}

export function getConferaPageAccess(role: ConferaRole, page: ConferaPageId) {
  return CONFERA_ROLE_ACCESS[role].pages[page] ?? null
}

export function canAccessConferaPage(role: ConferaRole, page: ConferaPageId) {
  return getConferaPageAccess(role, page) !== null
}

export function isConferaPageReadOnly(role: ConferaRole, page: ConferaPageId) {
  return getConferaPageAccess(role, page) === "read"
}

export function canPerformConferaAction(role: ConferaRole, action: ConferaAction) {
  return CONFERA_ROLE_ACCESS[role].actions.includes(action)
}

export function getAllowedConferaPages(role: ConferaRole) {
  return Object.keys(CONFERA_ROLE_ACCESS[role].pages) as ConferaPageId[]
}

export function canWriteConferaResource(role: ConferaRole, resource: string) {
  const actionMap: Record<string, ConferaAction[]> = {
    bookings: ["bookings:create", "bookings:update"],
    halls: ["halls:create", "halls:update"],
    clients: ["clients:manage"],
    services: ["services:manage"],
    equipment: ["equipment:create", "equipment:update"],
    billing: ["billing:manage"],
    staff: ["staff:create", "staff:update"],
  }
  return (actionMap[resource] ?? []).some((action) => canPerformConferaAction(role, action))
}

export function canUseConferaApi(role: ConferaRole, resource: string, method: string) {
  if (role === "Administrator") return true
  if (method === "GET") {
    const coordinatorReads = ["dashboard", "event-bookings", "event-halls", "clients", "event-services", "service-packages", "equipment", "invoices", "payments", "staff-assignments", "reports", "users", "event-booking-services", "booking-equipment"]
    const operationalReads = ["dashboard", "event-bookings", "event-halls", "equipment", "staff-assignments", "reports", "users", "booking-equipment"]
    return (role === "Event Coordinator" ? coordinatorReads : operationalReads).includes(resource)
  }
  if (role === "Event Coordinator") {
    return ["event-bookings", "clients", "invoices", "payments", "staff-assignments"].includes(resource) && (method === "POST" || method === "PATCH")
  }
  if (method !== "PATCH") return false
  return resource === "equipment" || resource === "staff-assignments" || resource === "booking-equipment"
}
