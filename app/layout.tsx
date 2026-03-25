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
  preload: false,
})

const taroca = localFont({
  src: '../public/fonts/taroca-regular/Taroca-Regular.ttf',
  variable: '--font-taroca',
  preload: false,
})

const gin = localFont({
  src: '../public/fonts/gin-test/GinTest-Regular.otf',
  variable: '--font-gin',
  preload: false,
})

const sabon = localFont({
  src: [
    {
      path: '../public/fonts/sabon/Sabon.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/sabon/SabonBold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/sabon/SabonItalic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../public/fonts/sabon/SabonBoldItalic.ttf',
      weight: '700',
      style: 'italic',
    },
  ],
  variable: '--font-sabon',
  preload: false,
})

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Guild of The Void | Character & Session Manager',
    template: '%s | Void Guild'
  },
  description: 'The central hub for The Void tabletop campaign. Manage your characters, join epic sessions, track XP, and explore new worlds with real-time Discord integration.',
  keywords: ['Pathfinder 2e', 'D&D 5e', 'TTRPG', 'Character Manager', 'Session Tracker', 'The Void'],
  openGraph: {
    title: 'Guild of The Void',
    description: 'The central hub for The Void tabletop campaign. Character management, session scheduling, and real-time XP tracking.',
    url: baseUrl,
    siteName: 'Void Guild',
    images: [
      {
        url: `${baseUrl}/PFVoid.svg`, // Defaulting to the Pathfinder logo as it's the primary system
        width: 800,
        height: 800,
        alt: 'Void Guild Logo',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Guild of The Void',
    description: 'Manage your TTRPG characters and sessions in the Void.',
    images: [`${baseUrl}/PFVoid.svg`],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    'robots': 'noai, noimageai',
    'ai-content': 'no',
  },
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
      <body className={`${geistSans.variable} ${geistMono.variable} ${oxProto.variable} ${taroca.variable} ${gin.variable} ${sabon.variable} antialiased font-sans`}>
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

