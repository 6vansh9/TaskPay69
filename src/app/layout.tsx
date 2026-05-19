import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { Suspense } from 'react'
import QueryProvider from '@/components/providers/QueryProvider'
import FloatingChatWrapper from '@/components/chat/FloatingChatWrapper'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: { default: 'TaskPay — Hire Top Freelancers', template: '%s | TaskPay' },
  description: 'Connect with skilled freelancers and get your projects done. Post a job, receive proposals, and pay securely.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[var(--font-geist-sans)]">
        <QueryProvider>
          {children}
          <Suspense fallback={null}>
            <FloatingChatWrapper />
          </Suspense>
        </QueryProvider>
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
