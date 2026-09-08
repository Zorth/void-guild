# Guild of The Void

## Project Overview

"Guild of The Void" is a web application designed to help users manage their characters and organize gaming sessions. It provides a platform for Game Masters to schedule and manage sessions, and for players to track their characters, join upcoming sessions, and view character details.

## Key Features

* **Character Management:** Create, edit, and delete your game characters.
* **Character Ranks & Perks:** Characters can be promoted to `Journeyman` and `Guildmaster` ranks, unlocking perks, special cosmetic badges, quest issuance sponsorship, and regional GM assignments.
* **The Black Void (Marketplace & Economy):** In-game auction house and marketplace supporting item listings with automated 2-sig-fig proxy bidding, level & price filters, duration presets, crafting/downtime service listings with editable level caps, and transaction settlement tracking.
* **Character Quests & Guild Sponsorship:** High-rank characters can post quests with split GP currency, extra item rewards, and party vs. per-person payout calculations; `Journeyman` and `Guildmaster` quests receive a 20% Guild sponsorship payback, with integrated financial ledger logs and payout claims.
* **Guildmaster Quest Suggestions & Regional Compensation:** Guildmasters can suggest quests to world owners for free review/approval, and sessions can assign regional Guildmasters who receive a 20% total loot compensation claimable in The Black Void.
* **Session Scheduling & Effective Level Derivation:** Game Masters can schedule sessions with automatic quest level inheritance (calculating XP gains and lock eligibility even when session level is inherited from its attached quest), lock sessions, and manage live combat clocks.
* **Live Initiative Tracker:** Event-driven initiative list with smooth Framer Motion drag-and-drop reordering, active turn tracking, and round timers.
* **Session Participation & Interest:** Players can join and leave sessions with their characters, or mark interest in sessions during planning phases.
* **XP & Loot Tracking:** Sessions award experience points to participating characters; GMs can distribute items and GP loot with individual claim assignments.
* **Pathbuilder 2e Character Sheet Sync:** Import and synchronize detailed Pathfinder 2e character sheets directly via the REST API or extension (AC, HP, saves, abilities, skills, gear, conditions).
* **External REST API & Key Management:** Secure public GET and authenticated POST/PATCH external API (`/api/external/v1`) with per-user API key management directly from the user profile.
* **System-Aware Quest Levels:** Dual-system quests automatically evaluate and display system-matched levels (`PF` vs `DnD`).
* **Character Relationships & Mutual Streaks:** Attending character lists display mutual session streaks (`🔥 3+ streak`), first-time co-adventurer badges (`NEW`), and total shared sessions (`5x`, `10x`).
* **World Visit & Streak Tracking:** Badges highlight a character's first visit to a world (`NEW WORLD`), world visit counts, and consecutive world streaks. GM bonus characters are excluded from attendance counts and never break streaks.
* **Character Commendation System:** Players can award 1 commendation per session to a party member across 4 categories (🎭 *Roleplay MVP*, ⚔️ *Tactical Genius*, 🛡️ *Clutch Savior*, 🌟 *Heroic MVP*). Earned commendations are displayed per category on character cards on the homepage.
* **Event-Driven Achievements & Cosmetics:** Achievements auto-unlock upon completion of real-world actions without background polling, awarding customizable card borders, font colors, and backgrounds.
* **7-Day Overview:** A calendar-like view of upcoming sessions for the next seven days, with visual cues for owned and joined sessions.
* **Character Website Links:** Characters can have an associated website link, editable by the owner and visible to all in session details.
* **Session Locking:** Game Masters can lock sessions to finalize attendance and XP awards.

## Technologies Used

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
- **Client-Side Throttling**: Heavy user sync functions (`users.syncUser`) are throttled using a 5-minute `sessionStorage` guard (`void_user_synced_<userId>`) to eliminate redundant calls during SPA route changes.

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
