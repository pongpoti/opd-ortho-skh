The application reads roster data and hospital personnel from Neon. The JSON
snapshot under `scripts/data/` is historical import input only; it is not a
runtime fallback.

Production Vercel builds run `scripts/migrate-roster.mjs --vercel-production`
before Next.js builds. The hook uses the deployment's injected `DATABASE_URL`,
which can point to a different Neon project from the connected management tools.
It applies only when both `VERCEL=1` and `VERCEL_ENV=production`. Local and preview
builds skip database writes. A migration failure stops deployment and leaves the
previous deployment available. An interrupted network response can make commit
confirmation uncertain; retrying the hook is safe.

For an explicit operation on a selected development branch:

```sh
npm run db:migrate-roster
```

This command uses `DATABASE_URL`; it is intentionally not limited to production.
Set it to the intended isolated branch before running. The hook requires existing
compatible `users` and `cast_logs` columns, so it cannot accidentally baseline an
unrelated empty database. It does not modify those tables or replay earlier
migrations. If `duty_overrides` is absent, it creates only that additive prerequisite
using its exact existing `0004` SQL, without fabricating a historical journal entry.

The hook uses Neon HTTP, a transaction advisory lock, and one transaction for
schema creation, validation, data import, and metadata. It loads the exact generated
`0006_canonical_roster.sql` and records its SHA-256 hash and journal timestamp in
`drizzle.__drizzle_migrations`. Compatible pre-existing canonical tables remain
unchanged. Incompatible columns, missing conflict targets, or conflicting journal
metadata fail the build. Existing earlier journal entries remain untouched; no
earlier entries are synthesized. A later migration is allowed when the exact
`0006` entry is already present.

Schema migration and historical import have separate markers. The hook owns
`drizzle.__roster_imports`, recording the import name, source hash, and completion
time. An ordinary Drizzle migration can create the tables and record `0006` first;
the hook still imports data when the import marker is absent. Once that marker
exists, later builds verify schema without reseeding. Deliberate canonical or
reference row deletions therefore survive future deployments. Changing the archived
snapshot requires a reviewed new import version, rather than silently reseeding it.

The initial import contains 15 staff physicians, 6 nurses, 32 intern physicians,
122 confirmed dates and 253 duty slots from September–December 2026, 14 recurring
holidays, and 5 weekly OPD rows. Monthly interns remain derived from that month's
`d2` duty slots. The directory stores full names, aliases, physician titles, and
the staff order from the second-call paper template.

All seed inserts skip existing canonical or reference records. The final seed
statement copies saved `duty_overrides` into `duty_slots`, preserving names,
cleared and cancelled markers, timestamps, and the user who edited the slot. It
updates an imported slot or a canonical slot older than the saved legacy edit.
Canonical admin edits survive imports. The runtime also merges newer legacy
edits while old deployment instances finish, and new writes synchronize both
tables transactionally. An application edit sets `duty_slots.source = 'admin'`
on both insert and update. Historical seeds use `import`; migrated edits use
`legacy`.

The separate importer remains available for explicit historical backfills after
schema creation. It can reinsert physically deleted historical rows, so use it
when that restoration is intended. It does not alter the hook's import marker:

```sh
node scripts/import-roster.mjs --apply
```

Validate the historical snapshot without connecting to a database by running
`node scripts/import-roster.mjs`. Generate reviewable SQL or a JSON array of
transaction statements with:

```sh
node scripts/import-roster.mjs --write-sql /tmp/roster.sql --write-json /tmp/roster-queries.json
```
