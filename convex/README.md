# Convex Backend Functions & Architecture Guidelines

Welcome to the Convex functions directory for **Guild of The Void**.

When working on Convex functions, always refer to [`convex/_generated/ai/guidelines.md`](./_generated/ai/guidelines.md) for full API details and syntax.

---

## Performance & Platform Limits Checklist

All backend queries, mutations, and actions must comply with Convex system limits:

### 1. Document & Memory Limits
- **Max Document Size**: 1 MB (UTF-8 encoded). Do not store growing arrays inside parent documents.
- **Max Array Size**: 8,192 items per field. Use sub-tables with foreign keys (`v.id("table")`) for 1-to-N relationships.
- **Max Object Keys**: 1,024 entries.

### 2. Transaction Caps
- **Max Read Documents**: 32,768 documents (or 16 MB) per query/mutation transaction.
- **Max Written Documents**: 8,192 documents (or 16 MB) per mutation transaction.
- **Execution Timeout**: 10 seconds per function call.

### 3. Database I/O & Indexing Rules
- **Always use `.withIndex(...)`**: Avoid `.collect()` or `.filter()` without composite or lookup indexes (`by_userId`, `by_userId_achievementId`, etc.).
- **Bounded Queries**: Use `.take(n)` or `.paginate()` on unbounded table reads.
- **No Background Polling**: Never call queries or mutations on fixed `setInterval` timers in frontend clients. Use event-driven action triggers.
- **Diff Patching**: Validate object changes prior to calling `ctx.db.patch()` to eliminate zero-op write overhead.

### 4. Authentication & Security
- Always derive identity via `ctx.auth.getUserIdentity()`.
- Use `identity.tokenIdentifier` for database lookups and security checks.
- Never rely on client-supplied `userId` parameters for access control.
