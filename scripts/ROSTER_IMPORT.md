The application reads roster data and hospital personnel from Neon. The JSON
snapshot under `scripts/data/` is historical import input only; it is not a
runtime fallback.

Apply Drizzle migrations to the selected database before importing:

```sh
npx drizzle-kit migrate
node scripts/import-roster.mjs --apply
```

Both commands use `DATABASE_URL`. Validate the snapshot without connecting to a
database by running `node scripts/import-roster.mjs`. To review or use connected
database tools, generate SQL or a JSON array of transaction statements:

```sh
node scripts/import-roster.mjs --write-sql /tmp/roster.sql --write-json /tmp/roster-queries.json
```

The import inserts the 15 staff physicians, 6 nurses, 32 intern physicians,
122 confirmed dates and 253 duty slots from September–December 2026, 14 recurring
holidays, and 5 weekly OPD rows. Monthly interns remain derived from that month's
`d2` duty slots. The directory stores full names, aliases, physician titles, and
the staff order from the second-call paper template.

All inserts skip existing canonical or reference records. The final statement
copies saved `duty_overrides` into `duty_slots`, preserving names, cleared and
cancelled markers, timestamps, and the user who edited the slot. It updates an
imported slot or a canonical slot older than the saved legacy edit. Existing
admin edits survive repeated imports.

An application edit must set `duty_slots.source = 'admin'` on both insert and
update. Historical seeds use `import`, and migrated overrides use `legacy`.
Retain the old `duty_overrides` table during rollout so the previous deployment
continues to work. Repeat the import after rollout to pick up any legacy edits
made while deployment was in progress.
