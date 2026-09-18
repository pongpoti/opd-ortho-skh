import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const [row] = await sql`select 1 as ok`;
    return Response.json({ connected: row.ok === 1 });
  } catch (error) {
    return Response.json(
      { connected: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
