import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const [row] = await sql`select 1 as ok`;
    const [table] = await sql`select to_regclass('public.users') as name`;
    const [roster] = await sql`select
      to_regclass('public.roster_personnel') IS NOT NULL AND
      to_regclass('public.duty_slots') IS NOT NULL AND
      to_regclass('public.duty_days') IS NOT NULL AND
      to_regclass('public.fixed_holidays') IS NOT NULL AND
      to_regclass('public.opd_weekly_schedule') IS NOT NULL AS ready`;
    const rosterCounts = roster.ready
      ? (await sql`select
          (select count(*)::integer from public.roster_personnel) as personnel,
          (select count(*)::integer from public.duty_days) as dates,
          (select count(*)::integer from public.duty_slots) as slots,
          (select count(*)::integer from public.fixed_holidays) as holidays,
          (select count(*)::integer from public.opd_weekly_schedule) as opd_weekdays`)[0]
      : null;
    return Response.json({ connected: row.ok === 1, usersTableExists: table.name !== null, rosterTablesReady: roster.ready, rosterCounts });
  } catch (error) {
    // This route is public (proxy skips /api) — keep driver/connection
    // details in the server log, not the response.
    console.error("health/db check failed", error);
    return Response.json({ connected: false }, { status: 500 });
  }
}
