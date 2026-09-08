import type { Metadata } from 'next'
import Link from 'next/link'
import { Lock, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy and data collection transparency for Guild of The Void.',
}

export default function PrivacyPage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl text-foreground">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-cinzel text-foreground flex items-center gap-3">
          <Lock className="h-8 w-8 text-primary" />
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Last updated: September 8, 2026
        </p>
      </div>

      <div className="space-y-8 text-muted-foreground leading-relaxed">
        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">1. Overview</h2>
          <p>
            This Privacy Policy explains how <strong className="text-foreground">Guild of The Void</strong> (&quot;we&quot;, &quot;us&quot;) collects, uses, and safeguards your information when you access or use <span className="font-mono text-xs text-primary">guild.tarragon.be</span>. We are committed to transparency, data minimization, and respecting your privacy under GDPR and relevant data protection laws.
          </p>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">2. Information We Collect</h2>
          <p>We only collect information necessary to provide the campaign management services:</p>
          <ul className="list-disc list-inside space-y-2 text-sm pl-2">
            <li>
              <strong className="text-foreground">Authentication Data:</strong> When signing in via Clerk, we receive your unique Clerk user identifier (`userId`), email address, display name/username, and avatar image URL.
            </li>
            <li>
              <strong className="text-foreground">Discord Integration Data:</strong> If linked, your Discord user ID and Discord handle are stored solely to automate thread notifications, campaign pings, and milestone announcements.
            </li>
            <li>
              <strong className="text-foreground">Campaign &amp; Gameplay Data:</strong> Characters (names, classes, levels, XP), sessions scheduled, attendance, world settings, calendar notes, and Black Void auction ledger records.
            </li>
            <li>
              <strong className="text-foreground">Application Telemetry:</strong> Anonymized usage metrics (page response speeds and general device metrics via Vercel Speed Insights and Vercel Analytics) without third-party ad profiling.
            </li>
          </ul>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">3. How We Use Your Information</h2>
          <p>Your data is processed strictly for the following operational purposes:</p>
          <ul className="list-disc list-inside space-y-1 text-sm pl-2">
            <li>Authenticating your session and verifying resource ownership.</li>
            <li>Powering real-time synchronization of characters, sessions, and initiative tracking via Convex.</li>
            <li>Delivering in-game Discord notifications to campaign channels.</li>
            <li>Enforcing API authorization rules and system security.</li>
          </ul>
          <p className="mt-2 text-sm font-semibold text-foreground">
            We will never sell, rent, or trade your personal information to third parties, data brokers, or advertising networks.
          </p>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">4. Third-Party Sub-Processors</h2>
          <p>The platform relies on the following trusted infrastructure providers:</p>
          <ul className="list-disc list-inside space-y-2 text-sm pl-2">
            <li>
              <strong className="text-foreground">Clerk:</strong> User authentication, session management, and identity tokens.
            </li>
            <li>
              <strong className="text-foreground">Convex:</strong> Cloud database, serverless backend functions, and reactive real-time sync.
            </li>
            <li>
              <strong className="text-foreground">Vercel:</strong> Web hosting, edge delivery, and privacy-centric telemetry.
            </li>
            <li>
              <strong className="text-foreground">Discord API:</strong> Automated webhook event forwarding for campaign session notifications.
            </li>
          </ul>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">5. Data Retention &amp; Your Rights</h2>
          <p>
            Under the General Data Protection Regulation (GDPR) and applicable privacy laws, you possess the right to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm pl-2">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate information.</li>
            <li>Request deletion of your account and associated character records (&quot;Right to be Forgotten&quot;).</li>
            <li>Revoke generated API keys at any time via your user profile.</li>
          </ul>
          <p className="mt-2 text-sm">
            To request data deletion or export, contact the campaign administrator or message via our Discord server.
          </p>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">6. Contact Information</h2>
          <p>
            For any privacy inquiries or data requests, please contact the developer via{' '}
            <a href="https://zorth.eu" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
              zorth.eu
            </a>{' '}
            or through the campaign Discord server.
          </p>
        </section>
      </div>
    </main>
  )
}
