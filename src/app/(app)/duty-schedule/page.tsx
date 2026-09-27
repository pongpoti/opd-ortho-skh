import { modulePageTitle } from "@/lib/modules";
import { DutyScheduleCalendar } from "@/modules/duty-schedule/components/duty-schedule-calendar";

export const metadata = {
  title: modulePageTitle("duty-schedule"),
};

/** Allow `after()` image push + Chromium fetch to finish after LIFF closes. */
export const maxDuration = 60;

export default function DutySchedulePage() {
  return <DutyScheduleCalendar />;
}
