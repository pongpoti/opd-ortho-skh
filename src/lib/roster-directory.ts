import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { rosterPersonnel } from "@/db/schema";
import { dutyParenInitial, parseDutyPersonName } from "@/modules/duty-schedule/lib/duty-data";

export type RosterRole = "staff" | "intern" | "nurse";
export type RosterPerson = typeof rosterPersonnel.$inferSelect;

/** Request-scoped memoization only: edits in Neon are visible on the next request. */
export const fetchRosterPersonnel = cache(async (role?: RosterRole): Promise<RosterPerson[]> => {
  const rows = await db.select().from(rosterPersonnel).where(role
    ? and(eq(rosterPersonnel.active, true), eq(rosterPersonnel.role, role))
    : eq(rosterPersonnel.active, true));
  return rows.sort((a, b) => a.fullName.localeCompare(b.fullName, "th"));
});

export async function getRosterFullNames(role: RosterRole): Promise<string[]> {
  return (await fetchRosterPersonnel(role)).map((person) => person.fullName);
}

/** Resolve known aliases or an unambiguous first name; never guess an identity. */
export async function resolveRosterFullName(
  raw: string | undefined,
  role: RosterRole,
  personnel?: RosterPerson[],
): Promise<string | null> {
  if (!raw || raw === "-" || raw === "งด") return null;
  const name = raw.trim().replace(/\s+/gu, " ");
  const rows = (personnel ?? await fetchRosterPersonnel(role)).filter((person) => person.role === role && person.active);
  const exact = rows.filter((person) => person.fullName === name || person.aliases.includes(name));
  if (exact.length === 1) return exact[0].fullName;
  const { first, rest } = parseDutyPersonName(name);
  const matches = rows.filter((person) => {
    const parts = parseDutyPersonName(person.fullName);
    if (parts.first !== first && !person.aliases.includes(first)) return false;
    if (!rest) return true;
    const isInitial = /^(?:\(.{1,3}\)|.\.)$/u.test(rest);
    return parts.rest === rest || !!parts.rest && isInitial && dutyParenInitial(parts.rest) === dutyParenInitial(rest);
  });
  return matches.length === 1 ? matches[0].fullName : null;
}
