import type { Metadata } from "next"
import { ConferaDashboard } from "@/components/confera/confera-dashboard"

export const metadata: Metadata = {
  title: "Confera Dashboard",
  description: "Confera Event Management System dashboard overview",
}

export default function ConferaPage() {
  return <ConferaDashboard />
}
