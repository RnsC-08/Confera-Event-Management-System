import type { Metadata } from "next"
import { ConferaReportsPage } from "@/components/confera/confera-reports-page"

export const metadata: Metadata = {
  title: "Reports | Confera",
  description: "View Confera operational reports",
}

export default function ReportsPage() {
  return <ConferaReportsPage />
}
