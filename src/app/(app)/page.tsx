import { Text, VStack } from "@chakra-ui/react";

import { AnimatedLogo } from "@/components/animated-logo";
import { TodayDuty } from "@/components/today-duty";

// Roster is date-dependent; always render for the request's calendar day.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <VStack align="stretch" gap={8} py={{ base: 2, sm: 4 }}>
      <VStack gap={3} align="center" textAlign="center">
        <AnimatedLogo style={{ width: "100%", maxWidth: "26rem" }} />
        <Text color="fg.muted" fontSize="md" maxW="md">
          เลือกเครื่องมือสำหรับงาน OPD ออร์โธปิดิกส์
        </Text>
      </VStack>

      <TodayDuty />
    </VStack>
  );
}
