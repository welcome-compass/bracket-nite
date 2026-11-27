# Bracket Nite

A phone-friendly single-elimination bracket app for 2–64 entries. Includes group voting, host-managed tournaments, personal copies, two themes, holiday starters and watched marks. Live at [bracketnite.com](https://bracketnite.com).

## Design system

The app uses the modern scorecard design: navy mastheads, serif tournament and entry titles, cobalt controls, and gold winner states. See [DESIGN.md](DESIGN.md) for tokens, components and responsive behavior.

## Architecture

Next.js on Vercel, with a Supabase Postgres database. Each tournament is one row in `tournaments`: the aggregate (entries, opening order, matches, guest identities and votes) lives in a `jsonb` column, and conditional `revision` updates serialize concurrent writes. Public responses omit guest secrets and individual vote records; only the current guest's own selection is visible before closure. Guest secrets are hashed at rest and carried by HttpOnly cookies; private recovery links use URL fragments, removed before requests.

Hosts sign in with their email. Supabase Auth emails a 6-digit code and checks it; the app then sets its own signed, 180-day `bn_host` cookie. Hosts are not database users, and the browser never talks to Supabase.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase keys and a SESSION_SECRET
npm run dev
```

- `npm test` runs the bracket engine and session tests.
- `npm run lint`
- `npm run build` is the production build.

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | Server | Signs the host login cookie. Required. |
| `NEXT_PUBLIC_SUPABASE_URL` | Server | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Server | Anon key. Sends and checks sign-in codes, and confirms the Data API is locked. RLS denies `anon`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Reads and writes `tournaments`. Never in the browser or in git. |

## Supabase

Migrations live in `supabase/migrations` and run in filename order. The Supabase GitHub integration applies new ones when they land on `main`.

Auth settings (dashboard, Authentication):

- Custom SMTP, the same provider as Pill Donkey. The built-in mailer only reaches your own team.
- The Magic Link email template uses `supabase/templates/sign-in-code.html`, with subject `Your Bracket Nite sign-in code`. It shows `{{ .Token }}` and matches the app’s navy, cobalt and gold palette. Apply the same template to Confirm signup if sign-up confirmations are enabled, so new hosts receive the same code email.
- Hosted email templates are managed in Supabase → Authentication → Email Templates. A Vercel deploy or a database migration does not apply this HTML automatically. Keep the hosted template in sync with the versioned file; do not replace the token with a real code.
- Site URL `https://bracketnite.com`.

Check the lock after deploy:

```bash
curl https://bracketnite.com/api/health
```

`anonDataApi` should be `"denied"`.

## Vercel

Import this repo as a Next.js project, set the four env vars for Production (and Preview if you want it), and add `bracketnite.com` under Domains. Pushes to `main` deploy.

## API

The JSON API is `/api`: GET without an ID lists only the signed-in host's brackets; GET `?id=<uuid>` returns a safe bracket view. POST actions: create, copy, setup, start, watched, join, recover, recovery, vote, close. Host actions enforce ownership server-side; guest votes require their bracket session. POSTs require a matching Origin. Brackets are unlisted rather than confidential: anyone with the link can view a started tournament, and anonymous users can join active group brackets. Guest sessions identify browsers, not verified people. Polling refreshes active bracket pages every 12 seconds while visible.

Sign-in lives at `POST /api/auth/code`, `POST /api/auth/verify` and `POST /api/auth/logout`.
