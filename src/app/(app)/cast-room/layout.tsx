import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { canAccessCastRoom, canAccessCastRoomDashboard } from "@/lib/module-access";
import { CastRoomTabs } from "@/modules/cast-room/components/cast-room-tabs";

export default async function CastRoomLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;

  if (!canAccessCastRoom(role)) {
    redirect("/");
  }

  return (
    <>
      <CastRoomTabs showDashboard={canAccessCastRoomDashboard(role)} />
      {children}
    </>
  );
}
