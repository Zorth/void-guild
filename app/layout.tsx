import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import ConvexClientProvider from '@/components/ConvexClientProvider'
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from 'sonner'
import LevelUpListener from '@/components/LevelUpListener'
import SessionClosedListener from '@/components/SessionClosedListener'
import { TooltipProvider } from '@/components/ui/tooltip'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Void Guild',
  description: 'Character Manager for the Guild of The Void',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider>
          <ConvexClientProvider>
            <TooltipProvider>
                {children}
                <Toaster position="bottom-right" theme="dark" />
                <LevelUpListener />
                <SessionClosedListener />
            </TooltipProvider>
          </ConvexClientProvider>
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  )
}

