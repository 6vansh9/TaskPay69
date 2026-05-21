import type { Metadata } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { Suspense } from 'react'
import QueryProvider from '@/components/providers/QueryProvider'
import FloatingChatWrapper from '@/components/chat/FloatingChatWrapper'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'TaskPay — Hire Top Freelancers', template: '%s | TaskPay' },
  description: 'Connect with skilled freelancers and get your projects done. Post a job, receive proposals, and pay securely.',
  icons: { icon: '/favicon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <QueryProvider>
            {children}
            <Suspense fallback={null}>
              <FloatingChatWrapper />
            </Suspense>
          </QueryProvider>
        </ThemeProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '10px', background: '#1f2937', color: '#f9fafb', fontSize: '14px' },
            success: { iconTheme: { primary: '#14a800', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
