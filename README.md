# OPD Ortho SKH

Internal superapp for the orthopedic OPD clinic. Each feature lives as an
independent module under `src/modules/<name>`, rendered through routes in
`src/app` and listed in the shared shell via `src/lib/modules.ts`.

## Stack

- **Framework**: Next.js (App Router) + TypeScript
- **UI**: Chakra UI v3, a custom glassmorphism theme (`src/theme.ts`) — translucent, blurred "glass" surfaces (`src/components/ui/glass-card.tsx`) over a soft teal/blue gradient background (`src/components/ui/background-gradient.tsx`), teal/blue `brand` color scale. Fonts: Sarabun (Thai) + IBM Plex Sans (Latin). Icons: lucide-react, used for module branding (`src/lib/module-icons.tsx`). SSR styling goes through a custom Emotion registry (`src/components/ui/emotion-registry.tsx`) — required for Chakra's Emotion-based styles to hydrate correctly under Next.js App Router streaming SSR.
- **Auth**: LINE LIFF (`@line/liff`) for sign-in, backed by Auth.js v5's `Credentials` provider (`src/auth.ts`) which verifies the LIFF ID token server-side via LINE's `/oauth2/v2.1/verify` endpoint — gated by `src/proxy.ts` (Next.js 16's renamed `middleware.ts`). First-time sign-ins are routed to `/register` to collect name, surname, and position before they can use the app.
- **Device gate** (`src/components/device-gate.tsx`): the whole app is blocked behind an "open in LINE" screen on every platform — mobile, tablet, and desktop alike — unless it's running inside the LIFF in-app browser (`liff.isInClient()`). This is a UX nudge, not a security boundary — it's a client-side check that a determined user could bypass, so it doesn't replace server-side auth.
- **Database**: Postgres via Neon, accessed with Drizzle ORM (`src/db`)
- **Deploy**: Vercel

## Modules

- **Waiting Time** (`src/modules/waiting-time`) — computes average OPD
  patient waiting time from two half-month CSV exports. Fully client-side;
  see `WAITING_TIME_DATAFLOW.md` for the business rules this was ported from.

  The physician staff roster (`STAFF_NAMES` in
  `src/modules/waiting-time/lib/config.ts`) is intentionally empty — it's
  personnel data that must be supplied per deployment before results are
  meaningful. Until then, calculations correctly fail with "the staff group
  is empty" rather than silently misclassifying everyone as non-staff.

## Auth setup (LINE LIFF)

The whole app is gated behind LINE Login via LIFF. To make it actually work:

1. Create (or reuse) a LINE Login channel at the [LINE Developers Console](https://developers.line.biz/console/).
2. Under that channel's **LIFF** tab, add a LIFF app with the Endpoint URL
   set to your deployment (e.g. `https://<your-vercel-domain>`), size `Full`.
   Copy its LIFF ID (format `{channelId}-{suffix}`).
3. Copy the channel's numeric ID into `LINE_CLIENT_ID` — it **must** match
   the numeric prefix of the LIFF ID (the part before the `-`), since the
   server verifies LIFF ID tokens against this channel.
4. Set `NEXT_PUBLIC_LIFF_ID` to the full LIFF ID from step 2.
5. Generate `AUTH_SECRET` with `npx auth secret` (or `openssl rand -base64 32`).
6. Set these as environment variables (Vercel project settings for
   production, `.env.local` for local dev — see `.env.example`).
7. The database also needs to be connected (see below) — user records
   (`users` table) are what "registered" means.

Sign-in only works from a real LINE client or a browser LIFF can complete its
own login redirect in — `liff.init()` calls out to LINE's servers, so it
can't be exercised in a fully offline/sandboxed environment. Until the env
vars above are set, the app will still build and deploy, but the login page
will show a sign-in error.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `AUTH_SECRET`,
`LINE_CLIENT_ID`, and `NEXT_PUBLIC_LIFF_ID` to run the full app locally,
including login.

### Database migrations

Schema lives in `src/db/schema.ts`; migrations are generated with Drizzle Kit
and committed under `drizzle/`:

```bash
npx drizzle-kit generate   # after changing schema.ts
npx drizzle-kit migrate    # apply pending migrations (needs DATABASE_URL)
```
