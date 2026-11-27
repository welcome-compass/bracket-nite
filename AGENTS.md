# AGENTS.md

## Core rule: keep it clean and tidy

This rule governs every other rule here. Leave the repo cleaner than you found it.

- Make small, focused changes. One purpose per commit.
- Delete dead code, stray files, and debug output before committing.
- Never commit secrets or `.env` files. Add new env vars to `.env.example` instead.
- Keep this file short. Add a rule only when it is needed, in the section it belongs to.

## Shipping code

Commit and push directly to `main`. No branches or pull requests.

1. `git pull --rebase origin main`
2. Run `npm run lint` and `npm test`. Fix anything that fails.
3. Commit with a short, clear message.
4. `git push origin main`

Pushes to `main` deploy to bracketnite.com through Vercel, so only push work that is ready.

Database changes go in a new `supabase/migrations/<timestamp>_<name>.sql`, timestamped after the latest one. Supabase applies it automatically when it lands on `main`, so never run it by hand.

## Project notes

Add short, durable facts about the app here as they come up.

- The Data API is locked. Only the server touches the database, with the service role key. New tables get RLS forced on and grants for `service_role` only, like `tournaments`.
- Hosts sign in with an emailed 6-digit code (Supabase Auth over custom SMTP). The app keeps its own signed `bn_host` cookie; hosts are not database users. Guests never sign in. They join a bracket with a nickname and a per-bracket cookie.
- A whole tournament is one `jsonb` row. Writes are conditional on `revision`, so concurrent votes retry instead of overwriting each other.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
