# OPD Ortho SKH

Internal superapp for the orthopedic OPD clinic. Each feature lives as an
independent module under `src/modules/<name>`, rendered through routes in
`src/app` and listed in the shared shell via `src/lib/modules.ts`.

## Stack

- **Framework**: Next.js (App Router) + TypeScript
- **UI**: Tailwind CSS + DaisyUI, custom `clinical`/`clinical-dark` themes — a teal/blue clinical palette instead of a generic preset (`src/app/globals.css`). Font: Noto Sans Thai. Icons: lucide-react, used for module branding (`src/lib/module-icons.tsx`).
- **Auth**: LINE Login via Auth.js v5 (`src/auth.ts`), gated by `src/proxy.ts` (Next.js 16's renamed `middleware.ts`). First-time sign-ins are routed to `/register` to collect name, surname, and position before they can use the app.
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

## Auth setup (LINE Login)

The whole app is gated behind LINE Login. To make it actually work:

1. Create a LINE Login channel at the [LINE Developers Console](https://developers.line.biz/console/).
2. Under the channel's LINE Login settings, add these callback URLs:
   - `http://localhost:3000/api/auth/callback/line` (local dev)
   - `https://<your-vercel-domain>/api/auth/callback/line` (production)
3. Copy the channel's Client ID/Secret into `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET`.
4. Generate `AUTH_SECRET` with `npx auth secret` (or `openssl rand -base64 32`).
5. Set all three as environment variables (Vercel project settings for
   production, `.env.local` for local dev — see `.env.example`).
6. The database also needs to be connected (see below) — user records
   (`users` table) are what "registered" means.

Until these are set, the app will still build and deploy, but sign-in will
fail with an Auth.js configuration error.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `AUTH_SECRET`,
and the `LINE_CLIENT_*` values to run the full app locally, including login.

### Database migrations

Schema lives in `src/db/schema.ts`; migrations are generated with Drizzle Kit
and committed under `drizzle/`:

```bash
npx drizzle-kit generate   # after changing schema.ts
npx drizzle-kit migrate    # apply pending migrations (needs DATABASE_URL)
```
