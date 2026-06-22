import type { Metadata } from "next"
import { ConferaStaffPage } from "@/components/confera/confera-staff-page"

export const metadata: Metadata = {
  title: "Staff Assignments | Confera",
  description: "Assign staff to Confera events and track tasks",
}

export default function StaffPage() {
  return <ConferaStaffPage />
}
