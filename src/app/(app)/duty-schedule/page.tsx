import { modulePageTitle } from "@/lib/modules";
import { DutyScheduleCalendar } from "@/modules/duty-schedule/components/duty-schedule-calendar";

export const metadata = {
  title: modulePageTitle("duty-schedule"),
};

export default function DutySchedulePage() {
  return <DutyScheduleCalendar />;
}
