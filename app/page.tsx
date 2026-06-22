import { redirect } from "next/navigation"
import { getConferaSession } from "@/lib/confera-auth"

export default async function Home() {
  const session = await getConferaSession()
  redirect(session ? "/confera" : "/login")
}
