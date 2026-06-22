import type { Metadata } from "next"
import { ConferaEquipmentPage } from "@/components/confera/confera-equipment-page"

export const metadata: Metadata = {
  title: "Equipment | Confera",
  description: "Manage Confera event equipment and availability",
}

export default function EquipmentPage() {
  return <ConferaEquipmentPage />
}
