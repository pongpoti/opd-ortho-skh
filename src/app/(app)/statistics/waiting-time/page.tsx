import type { Viewport } from "next";

import { modulePageTitle } from "@/lib/modules";
import { getRosterFullNames } from "@/lib/roster-directory";
import { OpdWaitTimeCalculator } from "@/modules/waiting-time/components/opd-wait-time-calculator";

export const metadata = {
  title: modulePageTitle("statistics", "waiting-time"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function WaitingTimePage() {
  const staffNames = await getRosterFullNames("staff");
  return <OpdWaitTimeCalculator staffNames={staffNames} />;
}
// Personnel must be read at request time so roster edits need no redeployment.
export const dynamic = "force-dynamic";
