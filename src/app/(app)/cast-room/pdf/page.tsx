import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Flex, Spinner } from "@chakra-ui/react";

import { auth } from "@/auth";
import { modulePageTitle } from "@/lib/modules";
import { CastCaseLogPdfPage } from "@/modules/cast-room/components/cast-case-log-pdf-page";
import { listCastVisitsForAdmin } from "@/modules/cast-room/lib/cast-dashboard-actions";
import { recentMonthOptions } from "@/modules/cast-room/lib/thai-date";

export const metadata = {
  title: modulePageTitle("cast-room", "pdf"),
};

function PdfFallback() {
  return (
    <Flex align="center" justify="center" minH="200px" py={8}>
      <Spinner colorPalette="brand" size="lg" />
    </Flex>
  );
}

async function CastCaseLogPdfData() {
  // Default to previous month (first option in the 6-month window) — must
  // match the client's initial selection, which skips its first load.
  const [defaultMonth] = recentMonthOptions(6);
  const result = await listCastVisitsForAdmin(defaultMonth.year, defaultMonth.month);
  const initialVisits = result.ok ? result.visits : [];
  const initialEmptyError =
    result.ok && initialVisits.length === 0 ? "ไม่มีรายการในเดือนที่เลือก" : null;
  return (
    <CastCaseLogPdfPage initialVisits={initialVisits} initialEmptyError={initialEmptyError} />
  );
}

export default async function CastRoomPdfPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/cast-room");
  }

  return (
    <Suspense fallback={<PdfFallback />}>
      <CastCaseLogPdfData />
    </Suspense>
  );
}
