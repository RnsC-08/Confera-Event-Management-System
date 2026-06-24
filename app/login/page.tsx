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
import conferaMark from "@/assets/logo.png"
import conferaName from "@/assets/name.png"

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#f8fbff_0%,#e9f6ff_44%,#eefcff_100%)] px-4 py-8 text-slate-900">
      <div className="pointer-events-none absolute -left-24 top-12 size-72 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-8 size-80 rounded-full bg-blue-300/35 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-0 h-56 w-[520px] -translate-x-1/2 -rotate-12 rounded-full border border-white/60 bg-white/20 blur-sm" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-44 w-[460px] translate-x-1/2 rotate-12 rounded-full border border-cyan-100/80 bg-cyan-100/20 blur-sm" />
      <div className="pointer-events-none absolute left-10 top-20 hidden h-32 w-32 rounded-full border border-white/80 bg-white/20 sm:block" />
      <div className="pointer-events-none absolute bottom-16 right-16 hidden h-24 w-24 rounded-full border border-cyan-100 bg-cyan-100/20 sm:block" />
      <div className="pointer-events-none absolute left-[18%] top-[62%] hidden h-16 w-16 bg-[radial-gradient(circle,#1648b8_1.5px,transparent_2px)] bg-[length:18px_18px] opacity-45 md:block" />
      <div className="pointer-events-none absolute right-[18%] top-[18%] hidden h-14 w-20 bg-[radial-gradient(circle,#06b6d4_1px,transparent_1.5px)] bg-[length:16px_16px] opacity-35 md:block" />

      <Card className="relative z-10 w-full max-w-[430px] rounded-3xl border border-white/70 bg-white/85 shadow-[0_26px_90px_rgba(15,45,100,0.18)] backdrop-blur-xl">
        <CardHeader className="items-center px-7 pb-5 pt-7 text-center sm:px-9">
          <div className="flex w-full flex-col items-center rounded-2xl border border-blue-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#f2f8ff_100%)] px-5 py-4 shadow-inner shadow-blue-50">
            <Image src={conferaMark} alt="Confera logo" className="h-auto w-20 object-contain sm:w-24" priority />
            <Image src={conferaName} alt="Confera" className="mt-2 h-auto w-full max-w-[230px] object-contain" priority />
          </div>
          <p className="mt-5 text-sm font-semibold text-[#1648b8]">Welcome back</p>
          <CardDescription className="mt-1 text-sm font-medium text-slate-600">Event Management System</CardDescription>
        </CardHeader>
        <CardContent className="px-7 pb-8 sm:px-9">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm leading-5 text-rose-700"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="admin@confera.local" className="h-11 rounded-xl border-slate-200 bg-white/95 pl-9 text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-[#1648b8] focus-visible:ring-blue-100" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="h-11 rounded-xl border-slate-200 bg-white/95 pl-9 text-slate-900 shadow-sm focus-visible:border-[#1648b8] focus-visible:ring-blue-100" />
              </div>
            </div>
            <Button type="submit" disabled={submitting || authLoading} className="h-11 w-full rounded-xl bg-[linear-gradient(135deg,#1648b8_0%,#123b98_100%)] font-semibold text-white shadow-lg shadow-blue-900/15 hover:from-[#1c58d6] hover:to-[#123b98] hover:shadow-blue-900/20 disabled:opacity-70">{submitting ? <><Loader2 className="animate-spin" />Signing in...</> : "Login"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
