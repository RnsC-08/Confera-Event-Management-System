import type { Metadata } from "next"
import { ConferaEventHallsPage } from "@/components/confera/confera-event-halls-page"

export const metadata: Metadata = {
  title: "Event Halls | Confera",
  description: "Manage Confera event halls and availability",
}

export default function EventHallsPage() {
  return <ConferaEventHallsPage />
}
