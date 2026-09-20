import type { Viewport } from "next";

import { OpdWaitTimeCalculator } from "@/modules/waiting-time/components/opd-wait-time-calculator";

export const metadata = {
  title: "ระยะเวลารอคอย — OPD Ortho SKH",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function WaitingTimePage() {
  return <OpdWaitTimeCalculator />;
}
