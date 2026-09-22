import { SimpleGrid, Text, VStack } from "@chakra-ui/react";

import { ToolLinkCard } from "@/components/tool-link-card";
import { MODULE_ICONS } from "@/lib/module-icons";
import { modulePageTitle } from "@/lib/modules";
import { statisticsReports } from "@/lib/statistics-reports";

export const metadata = {
  title: modulePageTitle("statistics"),
};

export default function StatisticsPage() {
  return (
    <VStack align="stretch" gap={6}>
      <Text color="fg.muted">เลือกรายงานที่ต้องการดู</Text>

      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
        {statisticsReports.map((report) => (
          <ToolLinkCard
            key={report.slug}
            href={report.href}
            name={report.name}
            description={report.description}
            Icon={MODULE_ICONS[report.icon]}
          />
        ))}
      </SimpleGrid>
    </VStack>
  );
}
