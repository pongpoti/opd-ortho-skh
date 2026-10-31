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

  The physician staff list is loaded from Neon's `roster_personnel` table
  at request time and passed to the calculator. An empty staff directory
  causes an explicit error instead of silently misclassifying patients.

## Roster data

Neon is the source of truth for duty slots, holiday dates, personnel full names
and aliases, second-call staff order, and the weekly OPD schedule. Calendar
edits are saved in `duty_slots`; the calendar, today's duty card, and both
exports read the same database data. The original September–December 2026
rosters live under `scripts/data/` only as a historical import snapshot.
See [the migration and import instructions](scripts/ROSTER_IMPORT.md).

The monthly second-call PDF (the "2nd" button on the duty calendar) fills in
each staff member's real duty (`d1`) and intern duty (`d2`) as ช/บ/ด
sub-duties and assigns second-call on top of them, one doctor per sub-duty,
in turn, the way the paper sheets are made: whoever has waited longest since
their last second-call goes next, and the turn order carries over from the
previous month. A day gets second-call only once its real duty is entered;
a day whose `d1` is empty, `-` or `งด` gets none. The rules (who is
excluded, weekday bans) live in `SECOND_CALL_RULES` in
`src/modules/duty-schedule/lib/second-call-assign.ts`.
The signed paper sheets for September and October 2026 are kept in
`second-call-sheets.ts`: those months show them as they were, and later months
carry on from them.

A daily Vercel Cron job (`vercel.json`, 00:05 Bangkok) calls
`/api/cron/second-call`, which saves this month's and next month's
assignments in `second_call_slots`. Saved names stay put while they still fit
the roster; only sub-duties a roster edit breaks are refilled, and only if
that leaves doctors more than two second-calls apart are days after today
given out again.
The PDF reads the saved assignments the same way. The route needs a
`CRON_SECRET` environment variable in Vercel (any long random string); Vercel
sends it with each cron call and the route refuses requests without it.

Holidays are weekends, the recurring `fixed_holidays`, and any date marked in
`duty_days`. Before saving second-call, the same cron job adds this year's and
next year's holidays from the Bank of Thailand "Financial Institutions'
Holidays" API to `duty_days` (`bot-holidays.ts`), which covers the Buddhist
holidays, substitution days and special holidays that move every year. It
needs `BOT_API_TOKEN` in Vercel: create an app at
[portal.api.bot.or.th](https://portal.api.bot.or.th), subscribe it to that
product, and copy the app's token. Without the token the job skips this step.
Holidays are only added, never removed, so a failed call changes nothing.

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

## Telegram alerts (new user registration)

After a successful `/register`, the server can push a short HTML alert to a
Telegram chat (personal DM or group) via Bot API `sendMessage`.

| Env var | Purpose |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | Destination chat id (user, group, or channel) |

Both must be set or the alert is skipped (registration still succeeds). To
discover `TELEGRAM_CHAT_ID`: open a chat with the bot (or add it to a group),
send any message, then call `getUpdates` on the Bot API and read `message.chat.id`.

## LINE Messaging (duty-schedule print)

The duty calendar **print** button pushes an A4 PNG of the OPD table + staff
calendar to the signed-in user via the Official Account chat. That needs the
Messaging API token in the **app** runtime (Vercel env), not only as a GitHub
Actions secret for the rich-menu script:

| Env var | Where | Purpose |
| --- | --- | --- |
| `LINE_CHANNEL_ACCESS_TOKEN` | Vercel + `.env.local` | Push image messages to users |

Also required: users must have added the OA as a friend. The Login/LIFF channel
and Messaging API channel must be linked under the same LINE provider so the
LIFF `userId` matches the Messaging API recipient.

## LINE rich menu

A branded single-tap rich menu under `line/rich-menu/` opens the main LIFF
URL (`https://liff.line.me/{LIFF_ID}`). Deploy it with the manual GitHub
Action **Deploy LINE Rich Menu**, or locally via
`scripts/line/deploy-rich-menu.sh`.

Repository secrets (add before running the Action):

| Secret | Value |
| --- | --- |
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API long-lived channel access token |
| `LINE_LIFF_ID` | Same LIFF ID as `NEXT_PUBLIC_LIFF_ID` |

See `line/rich-menu/README.md` for image regeneration and API details.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `AUTH_SECRET`,
`LINE_CLIENT_ID`, `NEXT_PUBLIC_LIFF_ID`, and (for print-to-LINE)
`LINE_CHANNEL_ACCESS_TOKEN` to run the full app locally, including login.

### Database migrations

Schema lives in `src/db/schema.ts`; migrations are generated with Drizzle Kit
and committed under `drizzle/`:

```bash
npx drizzle-kit generate   # after changing schema.ts
npx drizzle-kit migrate    # apply pending migrations (needs DATABASE_URL)
```
