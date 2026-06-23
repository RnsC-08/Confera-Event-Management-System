"use client"

import Image from "next/image"
import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2, LockKeyhole, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
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
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(145deg,#f8fbff_0%,#eef5fd_52%,#e8f0fb_100%)] px-4 py-8 text-slate-900">
      <Card className="w-full max-w-[430px] rounded-2xl border-blue-100/80 bg-white/95 shadow-[0_22px_70px_rgba(15,45,100,0.14)] backdrop-blur">
        <CardHeader className="items-center px-7 pb-5 pt-8 text-center sm:px-9">
          <div className="flex w-full justify-center rounded-xl border border-blue-100 bg-blue-50/35 px-5 py-4">
            <Image src="/confera/logo2.png" alt="Confera" width={260} height={65} className="h-auto w-full max-w-[230px] object-contain" priority />
          </div>
          <CardDescription className="mt-4 text-sm font-medium text-slate-600">Event Management System</CardDescription>
        </CardHeader>
        <CardContent className="px-7 pb-8 sm:px-9">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm leading-5 text-rose-700"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="admin@confera.local" className="h-11 border-slate-200 bg-white pl-9 text-slate-900 placeholder:text-slate-400 focus-visible:border-[#1648b8] focus-visible:ring-blue-100" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="h-11 border-slate-200 bg-white pl-9 text-slate-900 focus-visible:border-[#1648b8] focus-visible:ring-blue-100" />
              </div>
            </div>
            <Button type="submit" disabled={submitting || authLoading} className="h-11 w-full bg-[#1648b8] font-semibold text-white shadow-sm shadow-blue-900/10 hover:bg-[#123b98] disabled:opacity-70">{submitting ? <><Loader2 className="animate-spin" />Signing in...</> : "Login"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
