import { auth } from "@/auth";
import { modulePageTitle } from "@/lib/modules";
import { DutyScheduleCalendar } from "@/modules/duty-schedule/components/duty-schedule-calendar";

export const metadata = {
  title: modulePageTitle("duty-schedule"),
};

/** Allow `after()` image push + Chromium fetch to finish after LIFF closes. */
export const maxDuration = 60;

export default async function DutySchedulePage() {
  const session = await auth();
  const isAdmin = session?.user?.isRegistered === true && session.user.role === "admin";
  return <DutyScheduleCalendar isAdmin={isAdmin} />;
}
