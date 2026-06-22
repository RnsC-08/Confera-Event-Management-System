import type { Metadata } from "next"
import { ConferaInvoicesPage } from "@/components/confera/confera-invoices-page"

export const metadata: Metadata = {
  title: "Invoices & Payments | Confera",
  description: "Manage Confera event invoices and payments",
}

export default function InvoicesPage() {
  return <ConferaInvoicesPage />
}
