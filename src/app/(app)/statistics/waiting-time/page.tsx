import { VStack } from "@chakra-ui/react";

import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { OpdWaitTimeCalculator } from "@/modules/waiting-time/components/opd-wait-time-calculator";

export const metadata = {
  title: "ระยะเวลารอคอย — OPD Ortho SKH",
};

export default function WaitingTimePage() {
  return (
    <VStack gap={6} align="stretch">
      <PageBreadcrumb items={[{ label: "หน้าแรก", href: "/" }, { label: "สถิติ", href: "/statistics" }]} current="ระยะเวลารอคอย" />
      <OpdWaitTimeCalculator />
    </VStack>
  );
}
