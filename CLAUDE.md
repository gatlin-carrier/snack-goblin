# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Snack Goblin — an AI-assisted weekly meal planner aimed at ADHD parents. A React SPA
frontend and an Express + SQLite backend, deployed as a single Docker container that
serves the built frontend from the same Node process. Read `BRAND.md` before touching
any UI copy or visual design — voice (lowercase, warm, decision-reducing) is a hard
product constraint, not a suggestion.

## Commands

Backend (`backend/`):
- `npm run dev` — run server with nodemon on port 3710
- `npm start` — run server with plain node

Frontend (`frontend/`):
- `npm run dev` — Vite dev server; proxies `/api` → `http://localhost:3710`
- `npm run build` — production build into `frontend/dist/`
- `npm run preview` — preview the production build

Full stack: run both dev servers; hit the Vite URL. The backend serves
`frontend/dist` directly only when `NODE_ENV=production`.

Docker: `docker-compose up --build` (multi-stage build — frontend compiled, then
copied into the backend image; runs on container port 3710).

There is no test suite, linter, or formatter configured.

## Architecture

### Backend (`backend/`)
- **`server.js`** (~3500 lines) — the whole API. Defines the SQLite schema inline
  (`CREATE TABLE IF NOT EXISTS`), runs an idempotent `migrations` array of
  `ALTER TABLE` statements on boot, declares every `/api/*` route, and registers a
  weekly `node-cron` job (Sun 18:00) that auto-generates recipes and a family recap.
- **`auth.js`** — Supabase JWT bearer-token middleware (`makeRequireAuth`). Every
  `/api/*` route past line ~401 requires a valid token from an allowlisted user.
  Implements **household bootstrap**: the first `ALLOWED_EMAILS` entry is the
  "founder" — on their first authed request a household is created and all pre-existing
  `household_id IS NULL` rows are backfilled. Non-founders must be invited (membership
  is the access gate; `ALLOWED_EMAILS` is break-glass fallback).
- **`llm.js`** — provider-agnostic LLM abstraction (`chat`, `chatMessages`). Supports
  anthropic / openai / google / groq / ollama / lmstudio / custom. Reads nothing from
  env or DB — the **caller passes a settings object** (provider, model, api_key).
- **`passkeys.js`** — WebAuthn/passkey registration + auth (`@simplewebauthn/server`),
  for trust-this-device / Face ID re-auth on top of the Supabase session.

### Data model & multi-tenancy
SQLite via `better-sqlite3` (synchronous; WAL mode, foreign keys on). All user data is
**household-scoped**: user-facing tables carry both a legacy `user_id` and the current
`household_id` column. `SCOPED_TABLES` in `auth.js` is the canonical list. When adding
a route that reads/writes user data, scope queries by `req.householdId` (set by the
auth middleware alongside `req.userId` and `req.member`).

### Frontend (`frontend/`)
- React 18 + Vite, **Tailwind v4** via `@tailwindcss/vite` (no `tailwind.config.js` —
  config is CSS-first in `index.css`). UI is heavy inline-style "Liquid Glass" — see
  `src/lib/glass.jsx` for shared primitives (`GlassPill`, `THEME`).
- **`src/App.jsx`** — root: nav, view routing (no router library — `view` state),
  settings modals, onboarding gate.
- **`src/lib/auth.jsx`** — Supabase auth context. Monkey-patches `window.fetch` once
  to inject the `Authorization: Bearer` header on every `/api/*` call, so component
  code can call `fetch('/api/...')` directly with no token plumbing.
- **`src/lib/supabase.js`** — Supabase client; reads `VITE_SUPABASE_*` env vars.
- **`src/lib/prefs.jsx`** — user preferences context.
- LLM config is stored server-side (`llm_configs` table, `/api/llm-configs`); the
  active config is what `llm.js` calls receive.

### Configuration
Env vars are consumed at runtime by the backend (see `docker-compose.yml` for the full
list): `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`ALLOWED_EMAILS`, `KROGER_CLIENT_ID/SECRET`, `INSTACART_API_KEY`, `PEXELS_API_KEY`,
`PASSKEY_RP_ID`, `PASSKEY_ORIGIN`, `DB_PATH`. `.env.example` is incomplete — treat
`docker-compose.yml` as the source of truth.

### Mobile (`mobile/`) — Expo + NativeWind

Expo SDK 54, React 19, New Architecture enabled. File-based routing via Expo Router v6.
NativeWind v4.2 (Tailwind v3 under the hood) for styling. `expo-blur` for glassmorphism.

**Theme bridge**: `shared/tokens.js` is the single source of truth for colors, radii,
and food-photo URLs. `mobile/tailwind.config.js` imports from it — every custom color
(`text-accent`, `bg-goblin-bg`, etc.) comes from there. The web's Tailwind v4 `@theme`
block should be kept in sync with the same token values.

**NativeWind as cross-platform bridge**: the same `className` props work on both iOS/Android
(StyleSheet) and web (CSS via Metro). Run `npx expo start --web` in `mobile/` to serve
the app as a website alongside the Vite web app. Use `web:`, `native:`, `ios:`,
`android:` prefixes for platform-specific styling.

**Commands** (`mobile/`):
- `npx expo run:ios` — build + launch in iOS simulator (first run compiles native, ~3 min)
- `npx expo start` — Metro dev server (requires compatible Expo Go or dev client)
- `npx expo start --web` — serve as a website via Metro

**Key native deps** (all version-sensitive):
- `react-native-reanimated@~4.1.1` + `react-native-worklets@^0.7.0` — required pair
- `nativewind@^4` + `tailwindcss@^3` (NOT tailwindcss v4)
- `expo-blur` — `BlurView` for glass surfaces

**Auth**: `lib/auth.jsx` stores Supabase tokens in `expo-secure-store`. `lib/api.js`
wraps `fetch` with a Bearer header using the module-level `currentToken` export.
API base URL from `EXPO_PUBLIC_API_URL` env var (defaults to `http://localhost:3710`).

**Navigation**: Expo Router file-based. Tabs are `app/(tabs)/{index,plan,recipes,shopping,menu}.jsx`.
Settings screens open as modals from `app/settings/*.jsx`. Recipe detail and cook mode
are `app/recipe/[id].jsx` and `app/cook/[id].jsx`.

**Glass UI**: `components/Glass.jsx` wraps `BlurView` with a semi-transparent overlay.
`components/GlassPill.jsx` for interactive pills. Tab bar uses `BlurView` as background.

**Goblin mascot**: `components/Goblin.jsx` — pure `react-native-svg` paths, no image
files. 7 states: idle, sleeping, curious, cooking, hungry, well-fed, fixated.

## Conventions & gotchas
- `server.js` is intentionally monolithic — new endpoints go inline, grouped near
  related routes. Schema changes are **append-only**: add an `ALTER TABLE` to the
  `migrations` array; never edit an existing `CREATE TABLE` column for a shipped table.
- Routes before `app.use('/api', makeRequireAuth(...))` (e.g. `/api/health`) are
  unauthenticated; everything after requires auth.
- The backend container runs read-only with a non-root user; only `/data` (the DB
  volume) and `/tmp` are writable. Don't write files elsewhere at runtime.
- Outbound URL fetches (recipe import, images) must pass `isSafeExternalUrl()` —
  SSRF protection rejects private/loopback addresses.
