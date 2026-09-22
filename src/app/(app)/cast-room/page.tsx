import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { canAccessCastRoom } from "@/lib/module-access";
import { modulePageTitle } from "@/lib/modules";
import { CastRoomForm } from "@/modules/cast-room/components/cast-room-form";

export const metadata = {
  title: modulePageTitle("cast-room", "log"),
};

export default async function CastRoomPage() {
  const session = await auth();
  if (!canAccessCastRoom(session?.user?.role)) {
    redirect("/");
  }

  return <CastRoomForm />;
}
