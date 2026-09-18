import { OpdWaitTimeCalculator } from "@/modules/waiting-time/components/opd-wait-time-calculator";

export const metadata = {
  title: "Waiting Time — OPD Ortho SKH",
};

export default function WaitingTimePage() {
  return <OpdWaitTimeCalculator />;
}
