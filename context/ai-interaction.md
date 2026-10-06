# AI Interaction Guidelines

## Communication
- Concise and direct. Explain non-obvious decisions briefly.
- Ask before large refactors or architectural changes.
- Don't add features not in features.md. Never delete files without asking.

## Workflow (every task)
1. **Read** the next unchecked item in @tasks/TASKLIST.md and confirm scope in @context/current-task.md.
2. **Branch** — `feature/[phase]-short-name` (one branch per milestone is fine).
3. **Implement** exactly the item's scope. Nothing extra.
4. **Test** — run the item's acceptance check. Verify in the browser for UI work. Run `npm run lint`, `npm run build`, `npm run test` and fix errors. Domain work needs unit tests.
5. **Iterate** if needed.
6. **Commit** — only after lint/build/tests pass, and only with permission. Conventional messages (feat:, fix:, chore:, test:).
7. **Mark done** — tick `[x]` in TASKLIST.md, update current-task.md, move to the next item.

Do NOT commit without permission or on a failing build.

## One task at a time
- Follow @tasks/TASKLIST.md strictly in order. Don't pull future work forward.
- If an item seems to need something from a later item, stop and flag it.
- Items marked `[human]` are manual steps for the founder (e.g. Cloudflare and Google Cloud setup). Stop, give clear instructions, and wait. Never invent API keys or client IDs.

## When stuck
- After 2–3 failed attempts, stop and explain. No random fixes. Ask when unclear.
- If the spread-stack motion can't hit smooth 60fps or the bowed look doesn't read right, stop and report options before changing approach.

## Data & privacy rules (never override)
- **Least privilege.** Drive scope is `drive.file` only. Never request broader scopes (`drive`, `drive.readonly`, etc.).
- **Tokens stay in memory.** No access tokens in localStorage, sessionStorage, URLs, logs or error messages.
- **No destructive Drive actions without explicit UI confirmation.** Deleting or overwriting Drive files only happens from a user action with a confirmation dialog that names what will be removed.
- **Local data is never lost because of sync.** A failed pull/push leaves IndexedDB untouched. Never clear local data automatically.
- **Originals are respected.** Layout edits never modify image blobs.
- **No secrets in the repo.** `.env` is git-ignored; only `.env.example` with placeholders is committed.
- If a request conflicts with these, stop and flag rather than implement.

## Code review focus
Domain separation (no layout math in components) · single PageRenderer · repository boundary respected · Drive scope/token handling · Zod validation on all persisted data · object URL cleanup · performance of large books (lazy images, minimal re-renders).
