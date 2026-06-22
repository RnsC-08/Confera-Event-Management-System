import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Confera',
    template: '%s | Confera',
  },
  description: 'Event Management System for managing bookings, halls, clients, services, equipment, invoices, staff, reports, and users.',
  icons: {
    icon: '/confera/logo%203.png',
    apple: '/confera/logo%203.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
