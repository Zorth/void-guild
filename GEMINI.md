# Void Guild - Project Overview & Recent Implementations

This document serves as a foundational guide and record of the architectural decisions and features implemented in the Void Guild platform.

## 1. Sessions Management System
The main sessions interface (`components/sessions/Sessions.tsx`) has been refactored into a responsive, tabbed layout.

### Tabs Structure
- **Upcoming:** Displays a 7-day visual overview and a list of all active sessions. The "New Session" button is pinned to the right of the header in this tab for GMs.
- **Planning:** Features a monthly calendar view for coordinating future games.
- **Past:** Archives all locked sessions, including links to session reports.

### UI Responsiveness
- Implemented `flex-wrap` and container-aware logic to ensure the header (Title, Tabs, and Buttons) remains aligned and functional on screens smaller than 1015px.
- Calendar boxes use `aspect-square` for a consistent grid feel across devices.

---

## 2. Planning & Availability System
A dedicated system for users to coordinate future session dates without creating full session entries immediately.

### Core Components
- **Month Navigation:** Users can navigate through the current and future months. Past months are restricted.
- **Availability Matrix:** 
    - Users can click any future date to open an **Availability Dialog**.
    - The system separates **Game Masters** and **Players** in the availability list.
    - Usernames are fetched dynamically via Clerk server actions to ensure accuracy.
- **Visual Feedback:** 
    - Calendar days display a count of "Free" users.
    - Border colors are preserved (Gold for owned sessions on that day, Purple for joined sessions).
    - Past days are greyed out (`opacity-50 grayscale`) and non-interactive.

### Data Architecture (Convex)
- **Table:** `availability` (stores `userId`, `date`, `username`, `isGM`).
- **Optimization:** Queries use `withIndex` range checks (`q.gte` / `q.lte`) for $O(K)$ efficiency.
- **Cleanup:** An automated daily cron job (`convex/crons.ts`) purges availability records older than 24 hours to maintain database health.

---

## 3. Standardized Formatting
Global enforcement of specific date and time formats to ensure consistency across the application.

- **Date Format:** `YYYY/MM/DD`
- **Time Format:** `HH:MM` (24-hour clock)
- **Utilities:** Centralized in `lib/utils.tsx` via `formatDate()` and `formatTime()`.

---

## 4. Achievement & Celebration System
Real-time feedback loops to celebrate player and GM milestones.

### Real-time Listeners
Implemented global listeners in `app/layout.tsx` that monitor character data changes:
- **LevelUpListener:** Detects level increases. Triggers purple confetti and a purple-themed toast notification.
- **SessionClosedListener:** Notifies players when a session they participated in is ended, encouraging them to tip their GM.

### Customized Notifications (Sonner)
- **Level-Up Jokes:** Randomized meta-TTRPG humor (e.g., *"Time to spend 4 hours picking a feat you'll never use"*).
- **Rank Promotions:** Distinct **Gold-themed** toasts for `journeyman` and `guildmaster` ranks.
- **Toaster Stacking:** Achievement toasts use a 500ms-1000ms delay to ensure they always appear on top of session-related system toasts.

### GM Appreciation
- **Voidmaster Celebration:** When a GM closes a session, they are greeted with a unique **Golden Confetti** burst and a dedicated thank-you toast recognizing their effort.

---

## 5. Technical Integrity & Fixes
Significant stability improvements for production deployment:
- **Type Safety:** Fixed `Dispatch` vs `Functional` state mismatch in character selection.
- **Icon Compatibility:** Wrapped Lucide icons in `span` elements to handle the `title` attribute correctly without violating strict SVG prop types.
- **Schema Validation:** Ensured `username` fields in Convex mutations are strictly cast to `string` to match schema requirements.
