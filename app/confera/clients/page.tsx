import type { Metadata } from "next"
import { ConferaClientsPage } from "@/components/confera/confera-clients-page"

export const metadata: Metadata = {
  title: "Clients | Confera",
  description: "Manage Confera clients and event organizers",
}

export default function ClientsPage() {
  return <ConferaClientsPage />
}
