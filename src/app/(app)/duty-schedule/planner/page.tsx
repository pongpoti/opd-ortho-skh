import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { bangkokToday } from "@/lib/bangkok-date";
import { modulePageTitle } from "@/lib/modules";
import { DutyPlanner } from "@/modules/duty-schedule/components/duty-planner";
import { nextMonth } from "@/modules/duty-schedule/lib/second-call-repository";

export const metadata = {
  title: modulePageTitle("duty-schedule", "planner"),
};

/** Admin-only desktop planner; opens on the upcoming month. */
export default async function DutyPlannerPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/duty-schedule");
  }
  const upcoming = nextMonth(bangkokToday().year, bangkokToday().month);
  return <DutyPlanner initialYear={upcoming.year} initialMonth={upcoming.month} />;
}
