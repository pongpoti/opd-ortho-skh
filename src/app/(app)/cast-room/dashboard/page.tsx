import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CastRoomDashboard } from "@/modules/cast-room/components/cast-room-dashboard";
import { listCastVisitsForAdmin } from "@/modules/cast-room/lib/cast-dashboard-actions";

export const metadata = {
  title: "รายการบันทึก — เวรห้องเฝือก",
};

export default async function CastRoomDashboardPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/cast-room");
  }

  const now = new Date();
  const result = await listCastVisitsForAdmin(now.getFullYear(), now.getMonth() + 1);
  const initialVisits = result.ok ? result.visits : [];

  return <CastRoomDashboard initialVisits={initialVisits} />;
}
