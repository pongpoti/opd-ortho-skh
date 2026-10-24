import { internNamesForMonth, isDutyMarker, type DutyDay } from "@/modules/duty-schedule/lib/duty-data";
import { fetchRosterPersonnel, resolveRosterFullName } from "@/lib/roster-directory";
import { secondCallSheetCells, subDutiesOf } from "@/modules/duty-schedule/lib/second-call-assign";
import { buildSecondCallPdf } from "@/modules/duty-schedule/lib/second-call-pdf";
import { planSecondCallMonth, previousMonth } from "@/modules/duty-schedule/lib/second-call-repository";
import { verifySecondCallToken } from "@/modules/duty-schedule/lib/second-call-share";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const payload = token ? verifySecondCallToken(token) : null;
  if (!payload) return new Response("ลิงก์หมดอายุหรือไม่ถูกต้อง", { status: 403 });
  try {
    const { year, month } = payload;
    const prev = previousMonth(year, month);
    const personnel = await fetchRosterPersonnel();
    const staff = personnel.filter((person) => person.role === "staff");
    // Saved second-call (daily cron) where it still fits the roster; the rest
    // is assigned the same way the cron will save it.
    const [{ data, days, slots }, { data: prevData, days: prevDays, slots: prevSlots }] = await Promise.all([
      planSecondCallMonth(year, month, personnel), planSecondCallMonth(prev.year, prev.month, personnel),
    ]);

    // Interns: this month's d2 names. A name shows only once roster_personnel
    // knows the intern's full name; until then the row keeps its marks unnamed.
    const internRaw = (day: DutyDay | undefined) => {
      const name = day?.entries.d2?.trim();
      return name && !isDutyMarker(name) ? name : null;
    };
    const interns = await Promise.all(internNamesForMonth(year, month, data).map(async (raw) =>
      ({ key: raw, name: await resolveRosterFullName(raw, "intern", personnel) })));

    let cells: Map<string, string[]> | undefined;
    // Months without a staff roster stay a blank template.
    if (slots) {
      const carriedIn = prevSlots?.at(-1);
      const extra = Object.entries(data).flatMap(([day, info]) => {
        const raw = internRaw(info);
        return raw ? subDutiesOf(year, month, Number(day), info.holiday).map((sub) => ({ person: raw, ...sub })) : [];
      });
      const carriedIntern = internRaw(prevData[prevDays.length]);
      if (carriedIntern) extra.push({ person: carriedIntern, day: 1, shift: "ด" });
      cells = secondCallSheetCells({ days: days.length, slots, carriedIn: carriedIn && { ...carriedIn, day: 1 }, extra });
    }

    const bytes = await buildSecondCallPdf({ year, month, interns, staff, cells });
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
