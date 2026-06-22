import type { Metadata } from "next"
import { ConferaUsersPage } from "@/components/confera/confera-users-page"

export const metadata: Metadata = {
  title: "Users | Confera",
  description: "View active Confera users and roles",
}

export default function UsersPage() {
  return <ConferaUsersPage />
}
