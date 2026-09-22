import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Flex, Spinner } from "@chakra-ui/react";

import { auth } from "@/auth";
import { CastRoomDashboard } from "@/modules/cast-room/components/cast-room-dashboard";
import { listCastVisitsForAdmin } from "@/modules/cast-room/lib/cast-dashboard-actions";
import { operationalMonthYear } from "@/modules/cast-room/lib/operational-date";

export const metadata = {
  title: "รายการบันทึก — เวรห้องเฝือก",
};

function DashboardFallback() {
  return (
    <Flex align="center" justify="center" minH="200px" py={8}>
      <Spinner colorPalette="brand" size="lg" />
    </Flex>
  );
}

async function CastRoomDashboardData() {
  const { year, month } = operationalMonthYear();
  const result = await listCastVisitsForAdmin(year, month);
  const initialVisits = result.ok ? result.visits : [];
  return <CastRoomDashboard initialVisits={initialVisits} />;
}

export default async function CastRoomDashboardPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/cast-room");
  }

  return (
    <Suspense fallback={<DashboardFallback />}>
      <CastRoomDashboardData />
    </Suspense>
  );
}
