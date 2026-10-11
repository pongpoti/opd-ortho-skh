import { internNamesForMonth } from "@/modules/duty-schedule/lib/duty-data";
import { fetchDutyMonthData } from "@/modules/duty-schedule/lib/duty-repository";
import { fetchRosterPersonnel, resolveRosterFullName } from "@/lib/roster-directory";
import { buildBlankSecondCallPdf } from "@/modules/duty-schedule/lib/second-call-pdf";
import { verifySecondCallToken } from "@/modules/duty-schedule/lib/second-call-share";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const payload = token ? verifySecondCallToken(token) : null;
  if (!payload) return new Response("ลิงก์หมดอายุหรือไม่ถูกต้อง", { status: 403 });
  try {
    const { year, month } = payload;
    const [data, personnel] = await Promise.all([fetchDutyMonthData(year, month), fetchRosterPersonnel()]);
    const internNames = await Promise.all(internNamesForMonth(year, month, data).map(async (name) =>
      await resolveRosterFullName(name, "intern", personnel) ?? name));
    const bytes = await buildBlankSecondCallPdf({ year, month, internNames, staff: personnel.filter((person) => person.role === "staff") });
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
