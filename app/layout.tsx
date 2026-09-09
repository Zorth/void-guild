import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { Geist, Geist_Mono, MedievalSharp, Cinzel_Decorative, Fredoka } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import ConvexClientProvider from '@/components/ConvexClientProvider'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from 'sonner'
import LevelUpListener from '@/components/LevelUpListener'
import SessionClosedListener from '@/components/SessionClosedListener'
import AchievementListener from '@/components/AchievementListener'
import UserSync from '@/components/UserSync'
import { TooltipProvider } from '@/components/ui/tooltip'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const medievalSharp = MedievalSharp({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-medieval-sharp',
})

const cinzelDec = Cinzel_Decorative({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-cinzel-dec',
})

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
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
  preload: true,
  display: 'swap',
})

const taroca = localFont({
  src: '../public/fonts/taroca-regular/Taroca-Regular.ttf',
  variable: '--font-taroca',
  preload: true,
  display: 'swap',
})

const gin = localFont({
  src: '../public/fonts/gin-test/GinTest-Regular.otf',
  variable: '--font-gin',
  preload: true,
  display: 'swap',
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
  preload: true,
  display: 'swap',
})

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: '/',
  },
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
    'ai-content': 'no',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} ${oxProto.variable} ${taroca.variable} ${gin.variable} ${sabon.variable} ${medievalSharp.variable} ${cinzelDec.variable} ${fredoka.variable} antialiased font-sans`}>
        <ClerkProvider>
          <ConvexClientProvider>
            <TooltipProvider>
                <div className="min-h-screen min-h-[100dvh] flex flex-col">
                  <div className="flex-1">
                    {children}
                  </div>
                  <footer className="py-12 border-t border-muted/10 mt-12">
                    <div className="container mx-auto px-4 text-center text-sm text-muted-foreground space-y-4">
                      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
                        <Link href="/terms" className="hover:text-primary transition-colors underline-offset-4 hover:underline">
                          Terms of Service
                        </Link>
                        <span className="text-muted/40">•</span>
                        <Link href="/privacy" className="hover:text-primary transition-colors underline-offset-4 hover:underline">
                          Privacy Policy
                        </Link>
                        <span className="text-muted/40">•</span>
                        <Link href="/cookies" className="hover:text-primary transition-colors underline-offset-4 hover:underline">
                          Cookie Policy
                        </Link>
                      </div>
                      <p>
                        Developed by{' '}
                        <a 
                          href="https://zorth.eu" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-medium underline underline-offset-4 hover:text-primary transition-colors"
                        >
                          Zorth
                        </a>
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 max-w-xl mx-auto">
                        Guild of The Void is an unofficial campaign management tool. Pathfinder and D&amp;D trademarks and logos are property of their respective owners. Virtual currency has no real-world value.
                      </p>
                    </div>
                  </footer>
                </div>
                <Toaster 
                  theme="dark" 
                  position="bottom-right" 
                  toastOptions={{
                    style: {
                      background: '#0f172a',
                      color: '#f8fafc',
                      borderColor: '#334155',
                    },
                  }}
                />
                <LevelUpListener />
                <SessionClosedListener />
                <AchievementListener />
                <UserSync />
                {/* SVG Filter for Organic Plasma Tendril Warping */}
                <svg className="fixed pointer-events-none w-0 h-0 overflow-hidden" aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }}>
                  <defs>
                    <filter id="sync-plasma-displacement" x="-30%" y="-30%" width="160%" height="160%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.04 0.03" numOctaves="4" result="noise" seed="7">
                        <animate attributeName="baseFrequency" dur="4.5s" values="0.03 0.02; 0.06 0.07; 0.02 0.04; 0.03 0.02" repeatCount="indefinite" />
                      </feTurbulence>
                      <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                  </defs>
                </svg>
            </TooltipProvider>
          </ConvexClientProvider>
        </ClerkProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}

