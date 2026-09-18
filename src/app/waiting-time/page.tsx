import { OpdWaitTimeCalculator } from "@/modules/waiting-time/components/opd-wait-time-calculator";

export const metadata = {
  title: "ระยะเวลารอคอย — OPD Ortho SKH",
};

export default function WaitingTimePage() {
  return <OpdWaitTimeCalculator />;
}
