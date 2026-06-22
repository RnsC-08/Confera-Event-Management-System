"use client"

import Image from "next/image"
import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2, LockKeyhole, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && user) router.replace("/confera")
  }, [authLoading, router, user])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const result = await login(email, password)
      if (result.error) return setError(result.error)
      router.push("/confera")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(145deg,#f7faff_0%,#edf4fc_100%)] px-4 py-10">
      <Card className="w-full max-w-md rounded-2xl border-blue-100 bg-white shadow-[0_18px_55px_rgba(15,45,100,0.12)]">
        <CardHeader className="items-center pb-4 text-center">
          <Image src="/confera/logo%203.png" alt="Confera" width={72} height={72} className="size-16 object-contain" priority />
          <CardTitle className="mt-3 text-2xl text-slate-950">Confera</CardTitle>
          <CardDescription>Event Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="size-4" />{error}</div>}
            <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="admin@confera.local" className="border-slate-200 pl-9 focus-visible:border-blue-400 focus-visible:ring-blue-100" /></div></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="border-slate-200 pl-9 focus-visible:border-blue-400 focus-visible:ring-blue-100" /></div></div>
            <Button type="submit" disabled={submitting || authLoading} className="w-full bg-[#1648b8] text-white hover:bg-[#123b98]">{submitting ? <><Loader2 className="animate-spin" />Signing in...</> : "Login"}</Button>
          </form>
          <p className="mt-5 text-center text-xs text-slate-400">Local academic demo environment</p>
        </CardContent>
      </Card>
    </div>
  )
}
