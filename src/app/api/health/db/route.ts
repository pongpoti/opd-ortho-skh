import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const [row] = await sql`select 1 as ok`;
    const [table] = await sql`select to_regclass('public.users') as name`;
    return Response.json({ connected: row.ok === 1, usersTableExists: table.name !== null });
  } catch (error) {
    // This route is public (proxy skips /api) — keep driver/connection
    // details in the server log, not the response.
    console.error("health/db check failed", error);
    return Response.json({ connected: false }, { status: 500 });
  }
}
