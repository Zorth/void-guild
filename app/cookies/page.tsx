import type { Metadata } from 'next'
import Link from 'next/link'
import { Cookie, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Information regarding cookies and local browser storage used by Guild of The Void.',
}

export default function CookiesPage() {
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
          <Cookie className="h-8 w-8 text-primary" />
          Cookie &amp; Storage Policy
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Last updated: September 8, 2026
        </p>
      </div>

      <div className="space-y-8 text-muted-foreground leading-relaxed">
        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">1. What Are Cookies?</h2>
          <p>
            Cookies and browser storage mechanisms (such as localStorage and sessionStorage) are small files placed on your device to ensure websites function properly and maintain state between visits.
          </p>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">2. How We Use Cookies &amp; Local Storage</h2>
          <p>
            Guild of The Void uses only <strong>strictly necessary</strong> cookies and functional client storage required to authenticate and deliver our service:
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm border border-muted/20 rounded-lg">
              <thead className="bg-muted/30 text-foreground font-semibold">
                <tr>
                  <th className="p-3 border-b border-muted/20">Name / Key</th>
                  <th className="p-3 border-b border-muted/20">Provider</th>
                  <th className="p-3 border-b border-muted/20">Purpose</th>
                  <th className="p-3 border-b border-muted/20">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/10">
                <tr>
                  <td className="p-3 font-mono text-xs text-primary">__session, __clerk_*</td>
                  <td className="p-3">Clerk</td>
                  <td className="p-3">Maintains authenticated user session and security tokens.</td>
                  <td className="p-3">Strictly Necessary Cookie</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs text-primary">black_void_active_character_id</td>
                  <td className="p-3">Guild of The Void</td>
                  <td className="p-3">Persists your currently selected active character across tabs.</td>
                  <td className="p-3">Functional (localStorage)</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs text-primary">Vercel Web Analytics</td>
                  <td className="p-3">Vercel</td>
                  <td className="p-3">Collects privacy-preserving, cookieless telemetry to assess platform uptime and speed.</td>
                  <td className="p-3">Cookieless Telemetry</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">3. No Advertising or Tracking Cookies</h2>
          <p>
            We do not use advertising, marketing, or behavioral tracking cookies. No user data is sold, monetized, or provided to third-party ad networks.
          </p>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">4. Managing Cookies</h2>
          <p>
            You can configure your browser to block cookies or notify you when they are set. Note that disabling essential cookies will prevent you from signing in to your Guild of The Void account.
          </p>
        </section>
      </div>
    </main>
  )
}
