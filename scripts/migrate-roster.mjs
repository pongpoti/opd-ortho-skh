import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { neon } from "@neondatabase/serverless";
import { buildHistoricalRosterImportStatements, readHistoricalRoster } from "./import-roster.mjs";

const migrationTag = "0006_canonical_roster";
const importName = "historical-roster-v1";
const tableNames = ["duty_days", "duty_slots", "fixed_holidays", "opd_weekly_schedule", "roster_personnel"];

function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function statementBlock(body) {
  return `DO $roster_migration$\nBEGIN\n${body}\nEND\n$roster_migration$`;
}

/** Verify compatible columns and conflict targets without relying on constraint names. */
function validateTablesSql(tables, checkConstraints = true, schemaName = "public") {
  const columns = [];
  const constraints = [];
  for (const table of tables) {
    for (const column of Object.values(table.columns)) {
      const type = column.type === "timestamp" ? "timestamp without time zone"
        : column.type === "time" ? "time without time zone" : column.type;
      columns.push(`(${literal(table.name)}, ${literal(column.name)}, ${literal(type)}, ${column.notNull ? "TRUE" : "FALSE"})`);
    }
    if (!checkConstraints) continue;
    const primary = Object.values(table.columns).filter((column) => column.primaryKey).map((column) => column.name);
    if (primary.length) constraints.push({ table: table.name, type: "p", columns: primary });
    for (const constraint of Object.values(table.uniqueConstraints ?? {})) {
      constraints.push({ table: table.name, type: "u", columns: constraint.columns });
    }
  }
  return statementBlock(`
  IF EXISTS (
    SELECT 1 FROM (VALUES ${columns.join(",\n")}) AS expected(table_name, column_name, type_name, not_null)
    LEFT JOIN pg_namespace AS namespace ON namespace.nspname = ${literal(schemaName)}
    LEFT JOIN pg_class AS relation ON relation.relnamespace = namespace.oid AND relation.relname = expected.table_name AND relation.relkind IN ('r', 'p')
    LEFT JOIN pg_attribute AS attribute ON attribute.attrelid = relation.oid AND attribute.attname = expected.column_name AND attribute.attnum > 0 AND NOT attribute.attisdropped
    WHERE attribute.attname IS NULL OR format_type(attribute.atttypid, attribute.atttypmod) <> expected.type_name OR attribute.attnotnull <> expected.not_null
  ) THEN
    RAISE EXCEPTION 'Roster migration: an existing table has incompatible columns; no data was changed';
  END IF;
${constraints.map((constraint) => `
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = to_regclass(${literal(`${schemaName}.${constraint.table}`)})
      AND constraint_row.contype = ${literal(constraint.type)}
      AND ARRAY(SELECT attribute.attname::text FROM unnest(constraint_row.conkey) WITH ORDINALITY AS key_column(number, position)
        JOIN pg_attribute AS attribute ON attribute.attrelid = constraint_row.conrelid AND attribute.attnum = key_column.number ORDER BY key_column.position)
        = ARRAY[${constraint.columns.map(literal).join(", ")}]::text[]
  ) THEN
    RAISE EXCEPTION ${literal(`Roster migration: ${constraint.table} is missing a required unique or primary key; no data was changed`)};
  END IF;`).join("\n")}`);
}

export async function buildRosterMigrationStatements() {
  const [migrationSql, legacySql, journalText, snapshotText, historical] = await Promise.all([
    readFile(new URL(`../drizzle/${migrationTag}.sql`, import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_duty_overrides.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/meta/0006_snapshot.json", import.meta.url), "utf8"),
    readHistoricalRoster(),
  ]);
  const journal = JSON.parse(journalText);
  const snapshot = JSON.parse(snapshotText);
  const entry = journal.entries.find((item) => item.tag === migrationTag);
  if (!entry || !Number.isSafeInteger(entry.when)) throw new Error("Invalid roster migration journal");
  const hash = createHash("sha256").update(migrationSql).digest("hex");
  const sourceHash = createHash("sha256").update(JSON.stringify(historical)).digest("hex");
  const recorded = `EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = ${literal(hash)} AND created_at = ${entry.when})`;
  const imported = `EXISTS (SELECT 1 FROM drizzle.__roster_imports WHERE name = ${literal(importName)} AND source_hash = ${literal(sourceHash)})`;
  const migrationStatements = migrationSql.split("--> statement-breakpoint").map((statement) => statement.trim()).filter(Boolean);
  if (migrationStatements.length !== tableNames.length) throw new Error("Unexpected canonical roster migration structure");
  const schemaCreation = migrationStatements.map((statement, index) => {
    const name = tableNames[index];
    if (!statement.startsWith(`CREATE TABLE "${name}" (`)) throw new Error("Unexpected roster table order");
    return statementBlock(`
  IF to_regclass(${literal(`public.${name}`)}) IS NULL THEN
    IF ${recorded} THEN
      RAISE EXCEPTION 'Roster migration: a recorded roster table is missing; no data was changed';
    END IF;
    ${statement}
  END IF;`);
  });
  const initialImport = buildHistoricalRosterImportStatements(historical).map((statement) => statementBlock(`
  IF NOT ${imported} THEN
    ${statement};
  END IF;`));
  const statements = [
    "SET LOCAL search_path TO public",
    "SET LOCAL lock_timeout = '45s'",
    "SET LOCAL statement_timeout = '90s'",
    "SELECT pg_advisory_xact_lock(hashtextextended('opd-ortho-skh:canonical-roster', 0))",
    "CREATE SCHEMA IF NOT EXISTS drizzle",
    "CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)",
    statementBlock(`
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations' AND column_name = 'id' AND data_type = 'integer')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations' AND column_name = 'hash' AND data_type = 'text')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations' AND column_name = 'created_at' AND data_type = 'bigint') THEN
    RAISE EXCEPTION 'Roster migration: the existing migration journal is incompatible; no data was changed';
  END IF;
  IF EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at IS NULL OR hash IS NULL OR (created_at > ${entry.when} AND NOT ${recorded})
    OR (created_at = ${entry.when} AND hash <> ${literal(hash)}) OR (hash = ${literal(hash)} AND created_at <> ${entry.when})) THEN
    RAISE EXCEPTION 'Roster migration: journal hash or order conflicts with this deployment; no data was changed';
  END IF;`),
    // Recording 0006 must not silently baseline an unrelated empty database.
    // Check existing app columns without imposing old constraint names.
    validateTablesSql([snapshot.tables["public.users"], snapshot.tables["public.cast_logs"]], false),
    // Some prior deployments tolerated this table being absent. Ensure only
    // this additive prerequisite; do not replay or record previous migrations.
    statementBlock(`
  IF to_regclass('public.duty_overrides') IS NULL THEN
    ${legacySql.trim()}
  END IF;`),
    validateTablesSql([snapshot.tables["public.duty_overrides"]]),
    ...schemaCreation,
    validateTablesSql(tableNames.map((name) => snapshot.tables[`public.${name}`])),
    // Drizzle schema migration and historical data import are distinct events.
    // A normal Drizzle migration can create all tables before any seed import.
    "CREATE TABLE IF NOT EXISTS drizzle.__roster_imports (name text PRIMARY KEY, source_hash text NOT NULL, imported_at timestamptz NOT NULL DEFAULT now())",
    validateTablesSql([{ name: "__roster_imports", columns: {
      name: { name: "name", type: "text", notNull: true, primaryKey: true },
      source_hash: { name: "source_hash", type: "text", notNull: true, primaryKey: false },
      imported_at: { name: "imported_at", type: "timestamp with time zone", notNull: true, primaryKey: false },
    } }], true, "drizzle"),
    statementBlock(`
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'drizzle' AND table_name = '__roster_imports' AND column_name = 'name' AND data_type = 'text')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'drizzle' AND table_name = '__roster_imports' AND column_name = 'source_hash' AND data_type = 'text')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'drizzle' AND table_name = '__roster_imports' AND column_name = 'imported_at' AND data_type = 'timestamp with time zone') THEN
    RAISE EXCEPTION 'Roster migration: the existing import marker table is incompatible; no data was changed';
  END IF;
  IF EXISTS (SELECT 1 FROM drizzle.__roster_imports WHERE name = ${literal(importName)} AND source_hash <> ${literal(sourceHash)}) THEN
    RAISE EXCEPTION 'Roster migration: historical import source hash changed; review a new import version';
  END IF;`),
    ...initialImport,
    statementBlock(`
  IF NOT ${imported} AND (
    NOT EXISTS (SELECT 1 FROM roster_personnel) OR NOT EXISTS (SELECT 1 FROM duty_days)
    OR NOT EXISTS (SELECT 1 FROM duty_slots) OR NOT EXISTS (SELECT 1 FROM fixed_holidays)
    OR NOT EXISTS (SELECT 1 FROM opd_weekly_schedule)
  ) THEN
    RAISE EXCEPTION 'Roster migration: initial import is incomplete; no data was changed';
  END IF;`),
    `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) SELECT ${literal(hash)}, ${entry.when} WHERE NOT ${recorded}`,
    `INSERT INTO drizzle.__roster_imports (name, source_hash) SELECT ${literal(importName)}, ${literal(sourceHash)} WHERE NOT ${imported}`,
    `SELECT (SELECT count(*)::integer FROM roster_personnel) AS personnel,
      (SELECT count(*)::integer FROM duty_days) AS dates,
      (SELECT count(*)::integer FROM duty_slots) AS slots`,
  ];
  return { statements, hash, createdAt: entry.when };
}

export async function migrateRoster(url) {
  const { statements, hash } = await buildRosterMigrationStatements();
  const sql = neon(url);
  // READ COMMITTED gives a waiting deployment a fresh view after the lock.
  // Every DDL, import, and journal change commits together or rolls back.
  const results = await sql.transaction(statements.map((statement) => sql.query(statement)), {
    isolationLevel: "ReadCommitted",
    fetchOptions: { signal: AbortSignal.timeout(180_000) },
  });
  return { migration: migrationTag, hash: hash.slice(0, 12), ...results.at(-1)[0] };
}

async function main() {
  const { values } = parseArgs({ options: {
    apply: { type: "boolean", default: false },
    "vercel-production": { type: "boolean", default: false },
  } });
  if (values["vercel-production"] && (process.env.VERCEL !== "1" || process.env.VERCEL_ENV !== "production")) {
    console.log("Roster migration skipped outside a Vercel production build.");
    return;
  }
  if (!values.apply && !values["vercel-production"]) {
    const { hash } = await buildRosterMigrationStatements();
    console.log(`Validated ${migrationTag} (${hash.slice(0, 12)}). Use --apply to migrate the selected DATABASE_URL.`);
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for roster migration");
  console.log(JSON.stringify(await migrateRoster(process.env.DATABASE_URL)));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    const safeMessage = error?.code === "P0001" && String(error.message).startsWith("Roster migration:")
      ? String(error.message).slice(0, 240)
      : "Deployment stopped because roster migration could not be confirmed. Rerunning is safe.";
    const code = typeof error?.code === "string" && /^[A-Z0-9]{5}$/u.test(error.code) ? ` (${error.code})` : "";
    console.error(`${safeMessage}${code}`);
    process.exitCode = 1;
  });
}
