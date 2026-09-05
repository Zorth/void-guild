<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

# Developer & Agent Guidelines for Guild of The Void

## 1. Convex Architecture & Resource Limits

All backend code in `convex/` must strictly adhere to the following platform resource limits and performance constraints to avoid database I/O spikes and transaction timeouts:

### Platform Limits & Constraints
* **Document Size**: Maximum **1 MB** total size per document (UTF-8 encoded). Avoid storing unbounded arrays inside a single document (e.g. `v.array(v.object(...))`). Store child records in dedicated tables using foreign keys (`v.id("tableName")`).
* **Array & Object Limits**: Maximum **8,192 elements** per array field; maximum **1,024 entries** per object field.
* **Transaction Caps**: A single mutation/query transaction allows at most **32,768 documents read** (or 16 MB) and **8,192 documents written** (or 16 MB).
* **Execution Timeout**: Query and mutation functions must complete within **10 seconds**.

### Database I/O Optimization Rules
* **Mandatory Indexing**: **NEVER** use `.collect()` or `.filter()` without a preceding `.withIndex()`. Scans over unindexed collections read every document in memory and rapidly consume database I/O.
* **Bounded Queries**: Unbounded table queries MUST use `.take(n)` or `.paginate(...)`. Never rely on `.collect()` for growing collections.
* **Event-Driven Updates (No Polling Loops)**: **NEVER** use `setInterval` or continuous background polling to trigger mutations or query re-evaluations. Trigger syncs and evaluations strictly on user actions (clicks, page loads, auth state changes).
* **Client-Side Throttling**: Heavy sync mutations (e.g. `users.syncUser`) MUST be guarded by client-side throttling (e.g. 5-minute `sessionStorage` cooldown) to prevent repeated backend calls during SPA navigation.
* **Diff Validation**: Before calling `ctx.db.patch()`, verify that field values have actually changed (`isDiff`) to eliminate zero-change database write transactions.

---

## 2. Clerk Authentication & API Limits

### Rate Limits & Auth Rules
* **Rate Limits**: Clerk Backend REST API enforces a rate limit of **20 requests/second** per IP / instance. Avoid calling raw Clerk APIs inside Convex queries/mutations.
* **JWT Caching**: Session JWTs issued by Clerk have short lifespans (~60s). `ConvexProviderWithAuth` automatically handles background token refreshes.
* **Server-Side Identity Verification**:
  * **ALWAYS** obtain user identity via `ctx.auth.getUserIdentity()`.
  * **NEVER** accept a client-supplied `userId` parameter as the sole authorization mechanism.
  * **Canonical Identifier**: Prefer `identity.tokenIdentifier` for database lookups and document ownership checks.

---

## 3. Code Quality & Verification

* **Strict TypeScript**: Run `npx tsc --noEmit` before declaring any task complete. 0 errors allowed.
* **Single-Source Docstrings**: Preserve existing comments and docstrings.
* **Error Handling**: Log and address root causes—never wrap failing logic in empty `catch` blocks or dummy fallbacks.
