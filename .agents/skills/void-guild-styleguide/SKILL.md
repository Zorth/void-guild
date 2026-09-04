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

---

## 3. Code Modularity & Component Extraction

1. **Keep Component Files Focused**:
   - Main page/container files (`Characters.tsx`, `Sessions.tsx`, `WorldClient.tsx`) should remain lean (~300–400 lines max).
   - If a dialog tab, complex form, or customizer grows beyond 150–200 lines, extract it into its own dedicated `.tsx` script under `components/<domain>/`.

2. **Clear Separation of Concerns**:
   - **`convex/`**: Database schemas, queries, mutations, actions, and server-side evaluation logic.
   - **`lib/`**: Pure functions, data models, formatters, and cosmetic resolvers (e.g., `lib/cosmetics.ts`, `lib/utils.ts`).
   - **`components/`**: Domain-grouped UI components (`components/characters/`, `components/sessions/`, `components/world/`).

3. **Typed Component Props**:
   - Always define clear TypeScript interfaces for sub-component props.
   - Pass explicit handlers or immutable data structures rather than exposing internal page-level state directly.

---

## 4. Cosmetic & Achievement System Rules

1. **Achievement Lock Privacy**:
   - **Normal Achievements**: When locked, show `🔒 Requires achievement: [Achievement Title]`.
   - **Hidden Achievements**: When locked, show `🔒 Locked (Secret Achievement)`. **NEVER** reveal the title or description of locked hidden achievements to non-admin users.
   - **Admin Controls**: Filter controls for locked hidden achievements are restricted to admin users (`data?.isAdmin`).

2. **Date Formatting**:
   - Display achievement unlock timestamps formatted as `DD/MM/YYYY` (e.g., `Unlocked on 04/09/2026`).

3. **Color Swatch UI**:
   - Color choices MUST be rendered as a row of filled circle swatches (`w-8 h-8 rounded-full`).
   - Default theme color swatches display the actual default filled color (`bg-foreground` for names, `bg-muted-foreground` for subtitles) instead of text labels.

4. **Custom Border CSS & Independent Decoupling**:
   - Card Border options (`BORDER_SHAPE_OPTIONS`) and Card Background Tint options (`BG_COLOR_OPTIONS`) MUST operate 100% independently in any combination (e.g. Guildmaster Gold Border + Purple Tint, Rainbow Border + Gold Tint, etc.).
   - Multi-layer background gradient border classes (such as `.gold-card-border`) use CSS `--card-bg` custom variables in `padding-box` (`background: var(--card-bg, linear-gradient(var(--card), var(--card))) padding-box`) so background tints blend over opaque `var(--card)` inside the padding area without being overridden by or leaking into the `border-box` gradient.
   - When a custom border option button in the menu list is selected (`[data-selected="true"]`), its `padding-box` background layer MUST use an opaque purple gradient (`linear-gradient(#341556, #341556) padding-box`) so option selection is clearly indicated with purple while keeping the metallic border intact.

5. **Card Background Tint Options**:
   - All unlocked background tint options in customizer option menus (`BG_COLOR_OPTIONS`) MUST display their actual background tint color or gradient class (e.g. `gold-bg-tint`, `rgba(147, 51, 234, 0.15)`) unconditionally at all times so players can preview the tint.
   - Menu list selection MUST be indicated purely by changing the outer border & ring state (`border-2 border-purple-500 ring-2 ring-purple-500 font-bold`), rather than overwriting the background tint.

---

## 5. Optimization & Verification Guidelines

1. **Reactive Convex Queries**:
   - Query backend data using `useQuery(api.domain.queryName)`.
   - Pass `'skip'` when argument dependencies are not yet loaded.

2. **Performance Memoization**:
   - Wrap expensive inline data filters and sorted arrays with `useMemo`.

3. **Mandatory Verification**:
   - After completing any code edit or refactoring, ALWAYS execute:
     ```bash
     npx tsc --noEmit
     npm run build
     ```
   - Never consider a task finished until TypeScript check and production build pass cleanly with 0 errors.
