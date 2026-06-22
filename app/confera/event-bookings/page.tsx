import type { Metadata } from "next"
import { ConferaBookingsPage } from "@/components/confera/confera-bookings-page"

export const metadata: Metadata = {
  title: "Event Bookings | Confera",
  description: "Create, view and manage Confera event bookings",
}

export default function EventBookingsPage() {
  return <ConferaBookingsPage />
}
