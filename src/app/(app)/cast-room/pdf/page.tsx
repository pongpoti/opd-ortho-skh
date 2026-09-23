import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Flex, Spinner } from "@chakra-ui/react";

import { auth } from "@/auth";
import { modulePageTitle } from "@/lib/modules";
import { CastCaseLogPdfPage } from "@/modules/cast-room/components/cast-case-log-pdf-page";
import { listCastVisitsForAdmin } from "@/modules/cast-room/lib/cast-dashboard-actions";

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
  const now = new Date();
  const result = await listCastVisitsForAdmin(now.getFullYear(), now.getMonth() + 1);
  const initialVisits = result.ok ? result.visits : [];
  return <CastCaseLogPdfPage initialVisits={initialVisits} />;
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
