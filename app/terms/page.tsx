import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service, acceptable use policy, and community guidelines for Guild of The Void.',
}

export default function TermsPage() {
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
          <ShieldAlert className="h-8 w-8 text-primary" />
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Last updated: September 8, 2026
        </p>
      </div>

      <div className="space-y-8 text-muted-foreground leading-relaxed">
        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using <strong className="text-foreground">Guild of The Void</strong> (&quot;the Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) at <span className="font-mono text-xs text-primary">guild.tarragon.be</span>, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not access or use the Platform.
          </p>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">2. Description of Service</h2>
          <p>
            Guild of The Void is a community companion platform designed for tabletop roleplaying game (TTRPG) campaigns, including Pathfinder 2e and Dungeons &amp; Dragons 5e. Features include character progression management, session scheduling, in-game calendar tracking, quest coordination, and Discord integration.
          </p>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">3. Virtual Economy &amp; Marketplace Disclaimer</h2>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-amber-200/90 text-sm">
            <strong className="font-semibold text-amber-300 block mb-1">Important Legal Notice:</strong>
            All in-game currency (Gold Pieces / GP), experience points (XP), loot items, services, character progression, and transactions conducted via <strong>The Black Void</strong> marketplace are strictly virtual campaign ledger records.
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm pl-2">
            <li>Virtual currency and items hold <strong>zero real-world monetary value</strong>.</li>
            <li>No virtual items, gold, or services may be redeemed, sold, purchased, or bartered for fiat currency, cryptocurrencies, or real-world goods.</li>
            <li>We do not process financial transactions, payments, or real-world money on this platform.</li>
          </ul>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">4. User Conduct &amp; Content Standards</h2>
          <p>You agree not to use the Platform to:</p>
          <ul className="list-disc list-inside space-y-1 text-sm pl-2">
            <li>Upload, submit, or propagate abusive, harassing, defamatory, sexually explicit, or unlawful content in character names, world descriptions, quest notes, or session chats.</li>
            <li>Attempt to exploit, overload, flood, or circumvent server boundaries, Convex functions, or Discord webhooks.</li>
            <li>Abuse the External API by generating excessive requests or attempting unauthorized mutations of resources not owned by your account.</li>
            <li>Share or compromise API keys or impersonate other players or Game Masters.</li>
          </ul>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">5. API Usage &amp; Ownership Enforcement</h2>
          <p>
            API keys issued to your account allow programmatic interaction with your campaign data. API keys are restricted to reading public records and modifying only characters, sessions, or worlds owned by your account, unless administrative privileges are granted. We reserve the right to revoke API access or terminate accounts that breach these conditions.
          </p>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">6. Intellectual Property &amp; Fan Content Disclaimers</h2>
          <p>
            Guild of The Void is an unofficial campaign management tool and is not endorsed by or affiliated with Paizo Inc. or Wizards of the Coast LLC.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm pl-2">
            <li>
              <strong>Pathfinder:</strong> Pathfinder and associated marks and logos are trademarks of Paizo Inc. Published material used under the Paizo Community Use Policy or Open Game License (OGL).
            </li>
            <li>
              <strong>Dungeons &amp; Dragons:</strong> D&amp;D is a trademark of Wizards of the Coast LLC. Content referenced is subject to Wizards of the Coast Open Game License or Creative Commons licenses where applicable.
            </li>
            <li>
              <strong>Archives of Nethys:</strong> Hyperlinks to Archives of Nethys are provided for player reference and rules lookup.
            </li>
          </ul>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">7. Disclaimer of Warranties &amp; Limitation of Liability</h2>
          <p>
            The software and services are provided &quot;AS IS&quot; and without warranty of any kind, express or implied. Under no circumstances shall the developers, contributors, or operators be liable for any direct, indirect, incidental, special, or consequential damages resulting from data loss, downtime, or service interruption.
          </p>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">8. Changes to These Terms</h2>
          <p>
            We may revise these Terms from time to time. Continued use of the platform after updates take effect signifies your consent to the revised terms.
          </p>
        </section>

        <section className="space-y-3 bg-card/40 border border-muted/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground">9. Contact</h2>
          <p>
            If you have questions regarding these Terms, please contact the platform administrator or reach out via our community Discord.
          </p>
        </section>
      </div>
    </main>
  )
}
