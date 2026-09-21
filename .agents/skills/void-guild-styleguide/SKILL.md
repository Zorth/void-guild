---
name: void-guild-styleguide
description: "Comprehensive code standards, design system rules, modularity principles, and optimization guidelines for the Void Guild codebase. Activate when modifying components, writing Convex backend functions, adding UI features, or refactoring code to ensure consistency, clean single-column views, dark theme design, and modular TypeScript structure."
---

# Void Guild Codebase Style Guide & Standards

This document establishes the official code architecture, design system, component modularity, and optimization guidelines for **Void Guild**.

---

## 1. Core Stack & Architecture

- **Frontend**: Next.js 16 (App Router with Turbopack), React 19, TypeScript.
- **Backend & Database**: Convex (reactive server functions, schema validation, real-time sync).
- **Authentication**: Clerk (`@clerk/nextjs`).
- **Styling**: Tailwind CSS v4, Lucide React icons, Shadcn UI primitives.
- **Theme**: Unified Dark Theme (`className="dark"` on root `<html>`).

---

## 2. Design System & Theme Rules

1. **Dark Theme Primacy**:
   - The application operates strictly in **Dark Mode** (`.dark`).
   - Do not include light mode or medieval parchment theme toggles or conditional styling logic.

2. **Color Palette**:
   - **Primary Accent**: Deep Purple (`purple-500`, `purple-600`, `purple-700`, `text-purple-300`/`400`).
   - **Card Backgrounds**: Dark slate surfaces (`bg-card`, `bg-muted/20`, `bg-muted/30`).
   - **Highlights & Glows**: Translucent purple tints (`bg-purple-500/10`, `border-purple-500/30`).
   - **Success / Unlocked Indicators**: Emerald accents (`bg-emerald-500/15`, `text-emerald-400`, `border-emerald-500/30`).
   - **Avoid Mismatched Colors**: Do not use out-of-palette gold/amber background colors for standard UI cards unless explicitly representing GM crowns or specific rank icons.

3. **Layout & Single-Column Guidelines**:
   - Modal tabs, customizer menus, and list options should be structured as clean, mobile-friendly **single-column lists** (`flex flex-col gap-4`).
   - Grid options (like color swatches) should wrap cleanly (`flex flex-wrap gap-2.5 items-center`).

4. **The "YOU" Badge Standard**:
   - Any character card owned by the currently logged-in user MUST feature the standard purple pill badge:
     ```tsx
     <span className="text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold shrink-0">
       You
     </span>
     ```

5. **Action Button Pairing on Attending Character Cards**:
   - Secondary action pills (such as **Quote** `"` and **Commend** `Medal`) share a unified compact pill style:
     ```tsx
     className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full border border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all shrink-0 focus:outline-none"
     ```
   - When active or when counts exist, append a subtle rounded badge `px-1.5 py-0.2 bg-primary/20 text-primary rounded-full text-[8px]`.

---

## 3. Code Modularity & Domain Guidelines

1. **Keep Component Files Focused**:
   - Main page/container files (`Characters.tsx`, `Sessions.tsx`, `WorldClient.tsx`) should remain lean (~300–400 lines max).
   - If a dialog tab, complex form, or customizer grows beyond 150–200 lines, extract it into its own dedicated `.tsx` script under `components/<domain>/`.

2. **Clear Separation of Concerns**:
   - **`convex/`**: Database schemas, queries, mutations, actions, and server-side evaluation logic (`sessions.ts`, `blackVoid.ts`, `quests.ts`, `characters.ts`, `users.ts`, `quotes.ts`, `external_api.ts`).
   - **`lib/`**: Pure functions, data models, formatters, and cosmetic resolvers (e.g., `lib/cosmetics.ts`, `lib/utils.ts`).
   - **`components/`**: Domain-grouped UI components (`components/characters/`, `components/sessions/`, `components/world/`, `components/black-void/`).
   - **`app/api/`**: Next.js route handlers exposing the public & authenticated external REST API (`app/api/external/v1/`).

3. **World Faction Reputations**:
   - **Configuration**: Worlds support customizable `factions` (`string[]`) and `factionGroups` (`[{ name: string, factions: string[] }]`).
   - **Database Indexing**: The `reputations` table uses composite indexes (`by_world_character`, `by_world_faction`, `by_world_character_faction`). Never run unindexed full-table scans.
   - **Direct Inline Editing**: Reputation cells allow direct numeric click-to-edit. Mutations must validate that the score actually changed (`isDiff`) before calling `ctx.db.patch()` or `ctx.db.insert()`.
   - **Sorting Standards**: The faction reputation overview supports:
     - Factions: Alphabetical or manual custom ordering.
     - Characters: Default by level (descending), alphabetically by name, or by any individual faction reputation column.

4. **Session Quotes**:
   - **Context**: Character quotes are logged per session via the Quote button on attending characters.
   - **Database Storage**: The `quotes` table stores `sessionId`, `characterId`, `quote`, and optional `userId`, indexed by `by_session`, `by_character`, and `by_session_character`.
   - **Management & Deletion**: Users can view session quotes in the quote dialog and delete quotes they authored, quotes for their own characters, or any quote if they are session GM/owner or admin.

5. **Discord Integration Standards**:
   - **Plain Markdown Format**: When broadcasting quotes to Discord (`#ouroubouros-inn` via `DISCORD_CHANNEL_ID`), format content in plain markdown with a `> ` blockquote callout rather than rich embeds:
     ```markdown
     > “{quote}”
     — **{character.name}** in [{worldName}]({sessionLink})
     ```
   - **Embed Suppression**: Always set `flags: 4` (`SUPPRESS_EMBEDS`) on Discord API message payloads when posting quotes so session URLs do not generate bulky link preview cards.
   - **Error Resilience**: Discord API failures in actions should be logged and surfaced gracefully without blocking or rolling back database records.

6. **Initiative & Combat Tracking**:
   - Live initiative supports smooth drag-and-drop reordering, round timers, active turn indicators, and direct inline click-to-edit values for HP and tracker numbers in addition to increment buttons.

7. **Past Sessions Archive**:
   - Sessions list view supports dedicated tabs / filtering for upcoming vs. past sessions (`/sessions?past=true`), allowing players and GMs to review historical session logs, XP gains, loot, and quotes.

8. **The Black Void & Economy**:
   - Keep market listings, bidding logic (2-sig-fig auto-bids), character quest sponsorships (20% reimbursement), and regional Guildmaster cuts (20% session loot value) strictly consistent across both Convex mutations and `components/black-void/CharacterSheetLog.tsx`.

9. **Monthly Void Objectives**:
   - Community goals with monthly deadlines and 3 tiered milestones ($T_1 < T_2 < T_3$). Game Masters record session contributions via interactive slider/input when locking sessions, automatically registering non-GM participants to the contributors list. Participating characters claim scaled rewards ($6 \times 1.5^{\text{lvl}}$, $9 \times 1.5^{\text{lvl}}$, $12 \times 1.5^{\text{lvl}}$ rounded to 2 significant digits) when tiers are reached. Admins configure current and next month's goals seamlessly.

10. **Structured Quest Rewards**:
    - Quests differentiate between monetary rewards (`rewardMoneyGP` in GP with up to 2 decimals) and other found loot (`rewardOther`). Rewards can be flagged as `'party'` or `'per_person'`. Sponsorship calculations apply to the monetary component.

11. **Effective Session Level**:
    - Never assume `session.level` is directly populated. Always evaluate effective session level using `computeEffectiveLevel(session, quest)` so XP calculations and lock readiness correctly respect levels inherited from attached quests.

12. **Private & Unlisted Sessions**:
    - **Default Public & Backwards Compatibility**: Sessions default to public (`isPrivate: false`). Any session with `isPrivate === undefined` is treated as public.
    - **Unlisted Visibility**: Private sessions are excluded from the main public session list, calendar overview, and public API queries. They are only visible in lists to the session owner, players with attending characters in that session, and administrators.
    - **Manual Owner Adding**: Players cannot self-join or express interest in private sessions (`joinSession` and `expressInterest` throw an error). Characters can ONLY be added manually by the session's owner (or an admin) via the "Add Character" action.
    - **Easy Privacy Toggling**: Session owners can toggle a session between Public and Private with a single click via `toggleSessionPrivacy` in `SessionManagement.tsx`, or through the `SessionDialog` edit form.

---

## 4. Streaks, Relationships & Achievement Rules

1. **World Streaks are Character-Based**:
   - A world streak measures how many consecutive sessions **a specific character** has attended in that specific world without that character playing in a different world in between.
   - Playing a session in another world with a *different* character does not reset or affect another character's world streak.
   - A player earns world streak achievements (e.g. 3, 5, 10 sessions) when **any single character** owned by the player achieves that consecutive streak.

2. **Mutual Co-Adventurer Streaks**:
   - Attending character cards display mutual session streaks (`🔥 3+ streak`) between characters that attended consecutive sessions together.
   - First-time co-adventurer badges (`NEW`) appear when two characters play together for the first time.
   - GM bonus characters are excluded from physical attendance counts and never break player streaks.

3. **Achievement Lock Privacy**:
   - **Normal Achievements**: When locked, show `🔒 Requires achievement: [Achievement Title]`.
   - **Hidden Achievements**: When locked, show `🔒 Locked (Secret Achievement)`. **NEVER** reveal the title or description of locked hidden achievements to non-admin users.
   - **Admin Controls**: Filter controls for locked hidden achievements are restricted to admin users (`data?.isAdmin`).

4. **Date Formatting**:
   - Display achievement unlock timestamps formatted as `DD/MM/YYYY` (e.g., `Unlocked on 04/09/2026`).

---

## 5. Cosmetic System Rules

1. **Color Swatch UI**:
   - Color choices MUST be rendered as a row of filled circle swatches (`w-8 h-8 rounded-full`).
   - Default theme color swatches display the actual default filled color (`bg-foreground` for names, `bg-muted-foreground` for subtitles) instead of text labels.

2. **Custom Border CSS & Independent Decoupling**:
   - Card Border options (`BORDER_SHAPE_OPTIONS`) and Card Background Tint options (`BG_COLOR_OPTIONS`) MUST operate 100% independently in any combination (e.g. Guildmaster Gold Border + Purple Tint, Rainbow Border + Gold Tint, etc.).
   - Multi-layer background gradient border classes (such as `.gold-card-border`) use CSS `--card-bg` custom variables in `padding-box` (`background: var(--card-bg, linear-gradient(var(--card), var(--card))) padding-box`) so background tints blend over opaque `var(--card)` inside the padding area without being overridden by or leaking into the `border-box` gradient.
   - When a custom border option button in the menu list is selected (`[data-selected="true"]`), its `padding-box` background layer MUST use an opaque purple gradient (`linear-gradient(#341556, #341556) padding-box`) so option selection is clearly indicated with purple while keeping the metallic border intact.

3. **Card Background Tint Options**:
   - All unlocked background tint options in customizer option menus (`BG_COLOR_OPTIONS`) MUST display their actual background tint color or gradient class (e.g. `gold-bg-tint`, `rgba(147, 51, 234, 0.15)`) unconditionally at all times so players can preview the tint.
   - Menu list selection MUST be indicated purely by changing the outer border & ring state (`border-2 border-purple-500 ring-2 ring-purple-500 font-bold`), rather than overwriting the background tint.

---

## 6. Optimization, Convex Limits & Verification Guidelines

1. **Strict Rules of Hooks**:
   - React hooks (`useState`, `useQuery`, `useMutation`, `useAction`, `useUser`, etc.) must **ALWAYS** be declared at the top level of the component before any early returns (e.g., `if (items.length === 0) return ...`).

2. **Reactive Convex Queries**:
   - Query backend data using `useQuery(api.domain.queryName)`.
   - Pass `'skip'` when argument dependencies are not yet loaded.

3. **Performance Memoization**:
   - Wrap expensive inline data filters and sorted arrays with `useMemo`.

4. **Convex Platform Resource Limits**:
   - **Document Size**: Max 1 MB UTF-8. Avoid unbounded arrays inside single documents.
   - **Transaction Caps**: Max 32,768 documents read (or 16 MB); max 8,192 written (or 16 MB).
   - **Execution Timeout**: 10 seconds per function call.
   - **Mandatory Indexing**: **NEVER** use `.collect()` or `.filter()` without a preceding `.withIndex()`.
   - **Diff Validation**: Check field differences (`isDiff`) before calling `ctx.db.patch()`.
   - **No Polling**: Strictly event-driven updates. Throttled client-side syncs.

5. **Server-Side Identity Verification**:
   - Obtain user identity strictly via `ctx.auth.getUserIdentity()`. Never accept client-supplied `userId` parameters as the sole authorization mechanism.

6. **Mandatory Verification**:
   - After completing any code edit or refactoring, ALWAYS execute:
     ```bash
     npx tsc --noEmit
     npm run build
     ```
   - Never declare a task complete until TypeScript check and production build pass cleanly with **0 errors**.

