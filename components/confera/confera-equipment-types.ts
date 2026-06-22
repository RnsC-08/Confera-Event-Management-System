export const equipmentStatuses = ["Available", "Assigned", "Maintenance", "Unavailable"] as const
export type EquipmentStatus = (typeof equipmentStatuses)[number]

export type Equipment = {
  equipment_id: number
  name: string
  category: string
  quantity_total: number
  quantity_available: number
  unit_cost: number | string
  status: EquipmentStatus
  notes: string | null
  is_active: number
}
