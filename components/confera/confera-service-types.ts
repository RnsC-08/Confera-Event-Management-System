export const pricingModels = ["Flat", "PerUnit", "PerGuest", "PerHour"] as const
export type PricingModel = (typeof pricingModels)[number]

export type EventService = {
  event_service_id: number
  name: string
  category: string
  unit_price: number | string
  pricing_model: PricingModel
  unit_label: string | null
  description: string | null
  is_active: number
}

export type ServicePackageItem = {
  service_package_item_id: number
  event_service_id: number
  event_service_name: string
  category: string
  default_quantity: number | string
  notes: string | null
}

export type ServicePackage = {
  service_package_id: number
  name: string
  description: string | null
  price: number | string
  is_active: number
  items: ServicePackageItem[]
}
