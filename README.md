# Guild of The Void

## Project Overview

"Guild of The Void" is a web application designed to help users manage their characters and organize gaming sessions. It provides a platform for Game Masters to schedule and manage sessions, and for players to track their characters, join upcoming sessions, and view character details.

## Key Features

* **Character Management:** Create, edit, and delete your game characters.
* **Character Ranks & Perks:** Characters can be promoted to `Journeyman` and `Guildmaster` ranks, unlocking perks, special cosmetic badges, quest issuance sponsorship, and regional GM assignments.
* **The Black Void (Marketplace & Economy):** In-game auction house and marketplace supporting item listings with automated 2-sig-fig proxy bidding, level & price filters, duration presets, crafting/downtime service listings with editable level caps, and transaction settlement tracking.
* **Monthly Void Objectives:** Community goals with monthly deadlines and 3 tiered milestones ($T_1 < T_2 < T_3$). Game Masters record session contributions via interactive slider/input when locking sessions, automatically registering non-GM participants to the contributors list. Participating characters claim scaled rewards ($6 \times 1.5^{\text{lvl}}$, $9 \times 1.5^{\text{lvl}}$, $12 \times 1.5^{\text{lvl}}$ rounded to 2 significant digits) when tiers are reached. Admins can configure current and next month's goals seamlessly.
* **Character Quests & Guild Sponsorship:** High-rank characters can post quests with split GP currency, extra item rewards, and party vs. per-person payout calculations; `Journeyman` and `Guildmaster` quests receive a 20% Guild sponsorship payback, with integrated financial ledger logs and payout claims.
* **Guildmaster Quest Suggestions & Regional Compensation:** Guildmasters can suggest quests to world owners for free review/approval, and sessions can assign regional Guildmasters who receive a 20% total loot compensation claimable in The Black Void.
* **Session Scheduling & Archive:** Game Masters can schedule sessions with automatic quest level inheritance, lock sessions, and manage live combat clocks. Historical sessions can be easily browsed and filtered via dedicated Past Sessions navigation (`/sessions?past=true`).
* **Live Initiative Tracker & Tactical View (`/sessions/[sessionId]/gm`):** GM tactical view featuring a dual-column combat layout utilizing full viewport height with independently scrollable sections. Includes multi-encounter preparation tabs (`Combats`), monster group management with drag-and-drop repositioning between groups, monster duplication (`Duplicate`), quick damage/heal math calculator, inline condition/immunity/resistance/weakness badges, and a U-shaped tactical seating arena.
* **Baldur's Gate 3 Style Initiative Ribbon:** Horizontal combat ribbon along the bottom of the Combat view displaying all characters and monster groups in turn order with position numbers, turn crowns (`👑`), and next-up markers (`⏳`). Supports interactive drag-and-drop reordering: dragging a combatant to a new position automatically recalculates their initiative score to match their new place in the turn order.
* **Party Roster & Live Character Sheet Modal:** GM "Party" tab displays concise character cards for all attending heroes with full player names, HP bars, AC shield ratings, ability modifiers, and saving throws. Features a full-fledged "Edit Character" modal dialog allowing GMs to adjust current/max/temp HP, AC, abilities, saves, and add custom skills/lores with live Convex database synchronization.
* **Archives of Nethys (AoN) Loot & Treasure Management:** In-session loot tracker integrated directly into the Party view and session details, allowing Game Masters to search the Archives of Nethys (`/api/nethys/item`) for PF2e magic items and equipment to auto-fill names, links, and GP values. Supports trade good classification, per-character rewards, automated player net share calculation, character sheet logging, and 20% regional Guildmaster cuts.
* **World Factions & Reputation System:** World owners and admins can configure factions and faction groups (`factionGroups`), toggle visibility, and adjust reputation values with direct inline numeric editing. The reputation overview features flexible sorting for factions (alphabetical or manual) and characters (by level, name, or individual faction reputation).
* **Character Quotes & Discord Integration:** Log memorable character quotes directly from the attending character cards during a session. Quotes are broadcast in real-time to `#ouroubouros-inn` as plain markdown blockquotes (`> callout`) with embed cards suppressed, and can be managed directly in the session quote dialog.
* **Session Participation & Interest:** Players can join and leave sessions with their characters, or mark interest in sessions during planning phases.
* **XP & Loot Tracking:** Sessions award experience points to participating characters; GMs can distribute items and GP loot with individual claim assignments.
* **Pathbuilder 2e Character Sheet Sync:** Import and synchronize detailed Pathfinder 2e character sheets directly via the REST API or extension (AC, HP, saves, abilities, skills, gear, conditions).
* **External REST API & Key Management:** Secure public GET and authenticated POST/PATCH external API (`/api/external/v1`) with per-user API key management directly from the user profile.
* **System-Aware Quest Levels:** Dual-system quests automatically evaluate and display system-matched levels (`PF` vs `DnD`).
* **Character Relationships & Mutual Streaks:** Attending character lists display mutual session streaks (`🔥 3+ streak`), first-time co-adventurer badges (`NEW`), and total shared sessions (`5x`, `10x`).
* **Character-Based World Visit & Streak Tracking:** Badges highlight a character's first visit to a world (`NEW WORLD`), world visit counts, and consecutive world streaks per character (playing in another world with a different character does not break another character's streak). GM bonus characters are excluded from attendance counts and never break streaks.
* **Character Commendation System:** Players can award 1 commendation per session to a party member across 4 categories (🎭 *Roleplay MVP*, ⚔️ *Tactical Genius*, 🛡️ *Clutch Savior*, 🌟 *Heroic MVP*). Earned commendations are displayed per category on character cards on the homepage.
* **Event-Driven Achievements & Cosmetics:** Achievements auto-unlock upon completion of real-world actions without background polling, awarding customizable card borders, font colors, and backgrounds.
* **7-Day Overview:** A calendar-like view of upcoming sessions for the next seven days, with visual cues for owned and joined sessions.
* **Character Website Links:** Characters can have an associated website link, editable by the owner and visible to all in session details.
* **Interactive World Map & Editor:** Full-screen responsive map canvas supporting multi-map hierarchies with unique URLs (`/world/[worldname]/map/[mapSlug]`), smooth touch pinch/wheel zoom, interactive icon/text pins that can link to other maps, transparent overlay layers with player visibility toggling, polygon area drawing with customizable opacity, hexagonal or square exploration grids with fog of war reveal tools, and player/GM grid cell notes.
* **Self-Hosted Map Image & Tile Serving:** High-resolution map images, native SVGs, and DeepZoom WebP tile sets are served with CORS enabled from a self-hosted Docker + Nginx processor at `https://maps.tarragon.be` to completely bypass database size limits.
* **Member Perks & Custom Character Portraits:** Users with active memberships display an exclusive dragon head badge next to their character names and can upload custom character portraits (processed and served as optimized WebP via `void.tarragon.be`), which override default profile avatars in session attending lists.
* **Notification Preferences:** Configurable notification alerts for character level-ups, newly posted sessions, Black Void auction house listings, and open or expiring character bets.
* **Technologies Used**

* **Next.js:** React framework for building server-rendered and static web applications.
* **React:** Frontend library for building user interfaces.
* **Tailwind CSS:** Utility-first CSS framework for rapid UI development.
* **Convex:** Full-stack real-time database and serverless function backend.
* **Clerk:** User authentication and identity management.

---

## Performance & Platform Resource Limits

To ensure scalable, cost-effective database usage and zero-latency real-time updates, all frontend and backend code must observe Convex and Clerk resource constraints:

### Convex Database Limits & Rules
- **Document Size Cap**: Maximum 1 MB (UTF-8) per document. Child collections are stored in dedicated tables via `v.id("table")` foreign keys rather than growing `v.array()` attributes inside parent documents.
- **Transaction Read/Write Limits**: Max 32,768 read documents (16 MB) and 8,192 written documents (16 MB) per transaction.
- **Mandatory Indexing**: Queries must use `.withIndex(...)` composite indexes (e.g. `by_userId_achievementId`). Full collection scans (`.collect()`) on unindexed queries are forbidden.
- **Event-Driven Architecture**: Continuous background `setInterval` polling loops are completely removed. Achievements and user syncs are evaluated strictly on login and triggered immediately upon user interactions.
- **Batch Query Hydration (No N+1)**: List queries (e.g. `sessions.listSessions`, `sessions.publicListSessions`) collect distinct foreign IDs across all records and batch-fetch parent/child entities via single aggregated `Promise.all` passes, resolving relations in-memory via Maps instead of $O(N)$ repeated roundtrips.
- **Client-Side Throttling**: Heavy user sync functions (`users.syncUser`) are throttled using a 5-minute `sessionStorage` guard (`void_user_synced_<userId>`) to eliminate redundant calls during SPA route changes.
- **Canvas & Particle Render Throttling**: Interactive character cosmetics (`InSyncPlasma`, `InfernoFire`, `VoidNebula`, `TintParticles`, `BlazeTextParticles`) use `IntersectionObserver` to automatically halt animation loops when off-screen, cap canvas DPR (1.5 on desktop, 1.0 on mobile/touch screens to cut pixel fillrate by >55%), scale curve calculations dynamically, and remove costly per-particle `shadowBlur` operations.
- **Mobile Hardware-Accelerated Filter Guard**: Heavy SVG displacement filters (`feTurbulence`) are tuned to compact bounding boxes (`-15%` to `130%`) with 2 octaves on desktop, and automatically bypassed in favor of native GPU-accelerated CSS `drop-shadow` / `blur` on mobile (`@media (max-width: 768px)` / `(pointer: coarse)`) to ensure solid 60 FPS on mobile browsers (GeckoView / WebKit).

### Clerk Authentication Limits & Rules
- **Rate Limit**: Clerk REST APIs enforce a limit of 20 requests/second per IP/instance.
- **Server Identity Verification**: Authorization derives exclusively from `ctx.auth.getUserIdentity()`. Client-supplied user IDs are never trusted as authorization parameters.
- **Stable Token Identifier**: User records and security scope checks utilize `identity.tokenIdentifier`.

---

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

* Node.js (LTS version recommended)
* npm, yarn, pnpm, or bun (your preferred package manager)
* A Convex account and project set up.
* A Clerk account and application set up.

### Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/void-guild.git
    cd void-guild
    ```

2. **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

3. **Convex Setup:**
    * Obtain your `CONVEX_URL` from your Convex project dashboard.
    * Add it to your `.env.local` file:
        ```env
        CONVEX_URL=https://<your-project-name>.convex.cloud
        ```
    * Ensure your Convex authentication is configured with Clerk as per Convex documentation.

4. **Clerk Setup:**
    * Follow the Clerk documentation to create an application and get your API keys.
    * Add the following environment variables to your `.env.local` file:
        ```env
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_your_publishable_key
        CLERK_SECRET_KEY=sk_your_secret_key
        ```
    * Ensure your Convex authentication is configured with Clerk as per Convex documentation.

5. **Discord Setup (Optional):**
    * To enable Discord notifications, add the following environment variables to your Convex dashboard:
        ```env
        DISCORD_BOT_TOKEN=your_bot_token
        DISCORD_FORUM_CHANNEL_ID=your_forum_channel_id
        DISCORD_CHANNEL_ID=your_activity_channel_id
        DISCORD_ROLE_ID_PF=role_id_to_ping_for_pathfinder
        DISCORD_ROLE_ID_DND=role_id_to_ping_for_dnd
        DISCORD_PUBLIC_KEY=your_public_key
        ```

### Running the Development Server

Once everything is set up, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## Developer & API Documentation

For detailed subagent rules, coding standards, external APIs, and Convex function guidelines, refer to:
* [`API.md`](./API.md) - External REST API endpoints (v1.1) and authorization model
* [`CHARACTER_EXPORT_SPEC.md`](./CHARACTER_EXPORT_SPEC.md) - Pathbuilder 2e sync & character details schema specification
* [`AGENTS.md`](./AGENTS.md) - Developer & agent standards and platform limits
* [`CLAUDE.md`](./CLAUDE.md) - Development commands and guidelines
* [`convex/README.md`](./convex/README.md) - Backend architecture rules
* [`convex/_generated/ai/guidelines.md`](./convex/_generated/ai/guidelines.md) - Convex function conventions
