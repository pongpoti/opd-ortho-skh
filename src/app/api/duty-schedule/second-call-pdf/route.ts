import { internNamesForMonth, isDutyMarker, type DutyDay, type DutyMonthData } from "@/modules/duty-schedule/lib/duty-data";
import { fetchDutyMonthData } from "@/modules/duty-schedule/lib/duty-repository";
import { fetchRosterPersonnel, resolveRosterFullName, type RosterPerson } from "@/lib/roster-directory";
import { assignSecondCall, secondCallSheetCells, subDutiesOf } from "@/modules/duty-schedule/lib/second-call-assign";
import { buildSecondCallPdf } from "@/modules/duty-schedule/lib/second-call-pdf";
import { validSecondCallMonth, verifySecondCallToken } from "@/modules/duty-schedule/lib/second-call-share";

export const runtime = "nodejs";

const previousMonth = (year: number, month: number) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

async function loadMonth(year: number, month: number): Promise<DutyMonthData> {
  return validSecondCallMonth(year, month) ? fetchDutyMonthData(year, month) : {};
}

/** Real staff (d1) per day, resolved to roster full names. */
async function realDays(year: number, month: number, data: DutyMonthData, personnel: RosterPerson[]) {
  return Promise.all(Array.from({ length: daysIn(year, month) }, async (_, i) => ({
    holiday: data[i + 1]?.holiday ?? false,
    real: await resolveRosterFullName(data[i + 1]?.entries.d1, "staff", personnel),
  })));
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const payload = token ? verifySecondCallToken(token) : null;
  if (!payload) return new Response("ลิงก์หมดอายุหรือไม่ถูกต้อง", { status: 403 });
  try {
    const { year, month } = payload;
    const prev = previousMonth(year, month);
    const before = previousMonth(prev.year, prev.month);
    const [data, prevData, beforeData, personnel] = await Promise.all([
      fetchDutyMonthData(year, month), loadMonth(prev.year, prev.month), loadMonth(before.year, before.month), fetchRosterPersonnel(),
    ]);
    const staff = personnel.filter((person) => person.role === "staff");
    const staffNames = staff.map((person) => person.fullName);
    const [days, prevDays, beforeDays] = await Promise.all([
      realDays(year, month, data, personnel),
      realDays(prev.year, prev.month, prevData, personnel),
      realDays(before.year, before.month, beforeData, personnel),
    ]);

    // Interns: this month's d2 names (plus the intern whose last-day duty runs
    // into the 1st), resolved to roster full names when known.
    const internRaw = (day: DutyDay | undefined) => {
      const name = day?.entries.d2?.trim();
      return name && !isDutyMarker(name) ? name : null;
    };
    const carriedIntern = internRaw(prevData[prevDays.length]);
    const internRaws = internNamesForMonth(year, month, data);
    const internName = new Map(await Promise.all([...internRaws, ...(carriedIntern ? [carriedIntern] : [])].map(async (raw) =>
      [raw, await resolveRosterFullName(raw, "intern", personnel) ?? raw] as const)));
    const internNames = internRaws.map((raw) => internName.get(raw)!);

    let cells: Map<string, string[]> | undefined;
    // Months without a staff roster stay a blank template.
    if (days.some((day) => day.real)) {
      const { slots } = assignSecondCall({ year, month, days, staff: staffNames, previousReal: prevDays.at(-1)?.real ?? null });
      const carriedIn = prevDays.some((day) => day.real)
        ? assignSecondCall({ ...prev, days: prevDays, staff: staffNames, previousReal: beforeDays.at(-1)?.real ?? null }).slots.at(-1)
        : undefined;
      const extra = Object.entries(data).flatMap(([day, info]) => {
        const raw = internRaw(info);
        return raw ? subDutiesOf(year, month, Number(day), info.holiday).map((sub) => ({ person: internName.get(raw)!, ...sub })) : [];
      });
      if (carriedIntern) extra.push({ person: internName.get(carriedIntern)!, day: 1, shift: "ด" });
      cells = secondCallSheetCells({ days: days.length, slots, carriedIn: carriedIn && { ...carriedIn, day: 1 }, extra });
    }

    const bytes = await buildSecondCallPdf({ year, month, internNames, staff, cells });
    const filename = `second-call-${year + 543}-${String(month + 1).padStart(2, "0")}.pdf`;
    return new Response(Uint8Array.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("second-call PDF failed", error);
    return new Response("สร้าง PDF ไม่สำเร็จ กรุณาลองอีกครั้ง", { status: 500 });
  }
}
