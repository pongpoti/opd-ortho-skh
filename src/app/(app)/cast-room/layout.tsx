import { auth } from "@/auth";
import { CastRoomTabs } from "@/modules/cast-room/components/cast-room-tabs";

export default async function CastRoomLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  return (
    <>
      <CastRoomTabs isAdmin={isAdmin} />
      {children}
    </>
  );
}
