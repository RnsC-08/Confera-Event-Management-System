import type { Metadata } from "next"
import { ConferaServicesPage } from "@/components/confera/confera-services-page"

export const metadata: Metadata = {
  title: "Services | Confera",
  description: "Manage Confera event services and service packages",
}

export default function ServicesPage() {
  return <ConferaServicesPage />
}
