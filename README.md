# OPD Ortho SKH

Internal superapp for the orthopedic OPD clinic. Each feature lives as an
independent module under `src/modules/<name>`, rendered through routes in
`src/app` and listed in the shared shell via `src/lib/modules.ts`.

## Stack

- **Framework**: Next.js (App Router) + TypeScript
- **UI**: Tailwind CSS + DaisyUI, stock `light`/`dark` themes (DaisyUI's actual defaults, `src/app/globals.css`). Font: Noto Sans Thai.
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

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and set `DATABASE_URL` to enable the
database (not required for the Waiting Time module, which stores nothing).
