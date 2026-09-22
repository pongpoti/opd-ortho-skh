import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { canAccessCastRoom } from "@/lib/module-access";
import { CastRoomForm } from "@/modules/cast-room/components/cast-room-form";

export const metadata = {
  title: "เวรห้องเฝือก — OPD Ortho SKH",
};

export default async function CastRoomPage() {
  const session = await auth();
  if (!canAccessCastRoom(session?.user?.role)) {
    redirect("/");
  }

  return <CastRoomForm />;
}
