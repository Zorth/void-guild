import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import ConvexClientProvider from '@/components/ConvexClientProvider'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from 'sonner'
import LevelUpListener from '@/components/LevelUpListener'
import SessionClosedListener from '@/components/SessionClosedListener'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/ThemeToggle'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const oxProto = localFont({
  src: [
    {
      path: '../public/fonts/0xProtoNerdFontPropo-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/0xProtoNerdFontPropo-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-ox-proto',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.classList.add(savedTheme);
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${oxProto.variable} antialiased font-sans`}>
        <ClerkProvider>
          <ConvexClientProvider>
            <TooltipProvider>
                {children}
                <Toaster position="bottom-right" />
                <LevelUpListener />
                <SessionClosedListener />
            </TooltipProvider>
          </ConvexClientProvider>
        </ClerkProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}

