# Bracket Night

A phone-friendly single-elimination bracket app for 2–64 entries. Includes group voting, host-managed tournaments, personal copies, two themes, holiday starters and watched marks.

## Initial source snapshot

This is a basic initial commit for the public GitHub repository. It preserves the existing implementation; a Supabase migration is follow-up work. This source currently uses Sites/D1 and ChatGPT sign-in, and does not include a Supabase integration or credentials. It is not configured as a standalone deployment.

The original hosting project ID has been removed. Configure hosting, the database binding and authentication before expecting a new deployment to run. Do not commit API keys, service-role credentials, database exports or participant data.

## Architecture

Vinext/React on Cloudflare Workers with a Sites-provisioned D1 database. Each tournament aggregate includes entries, opening order, matches, guest identities and votes. Conditional revision updates serialize concurrent writes. Public responses omit guest secrets and individual vote records; only the current guest's own selection is visible before closure. Host identity comes from dispatch-owned ChatGPT sign-in. Guest secrets are hashed at rest and carried by HttpOnly cookies; private recovery links use URL fragments, removed before requests.

## Local development

Use Node 22.13 or later. Install with the Sites install-dependencies helper, generate and apply local D1 migrations as documented in the Sites starter, then run `npm run dev`. Local sign-in is simulated only on loopback; production uses Sites authentication.

- `npx tsc --noEmit`
- `node --experimental-strip-types --test tests/engine.test.ts`
- `node tests/integration.mjs` (requires local server and migrated D1; creates disposable local QA records)
- `npm run build`

The JSON API is `/api`: GET without an ID lists only the signed-in creator's brackets; GET `?id=<uuid>` returns a safe bracket view. POST actions: create, copy, setup, start, watched, join, recover, recovery, vote, close. Host actions enforce ownership server-side; guest votes require their bracket session. POSTs require a matching Origin. Brackets are unlisted rather than confidential: anyone with the link can view a started tournament, and anonymous users can join active group brackets. Guest sessions identify browsers, not verified people.

## Operations

The hosting manifest declares the `DB` binding. Sites applies committed migrations when deploying. No external movie APIs, scheduled tasks, uploads or paid API keys are required. Sharing is link-only, with no directory or public listing API. Polling refreshes active bracket pages every 12 seconds while visible.
