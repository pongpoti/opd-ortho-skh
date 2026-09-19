import NextLink from "next/link";
import { Circle, Heading, HStack, Link as ChakraLink, SimpleGrid, Text, VStack } from "@chakra-ui/react";

import { GlassCard } from "@/components/ui/glass-card";
import { MODULE_ICONS } from "@/lib/module-icons";
import { statisticsReports } from "@/lib/statistics-reports";

export const metadata = {
  title: "สถิติ — OPD Ortho SKH",
};

export default function StatisticsPage() {
  return (
    <VStack align="stretch" gap={6}>
      <VStack align="start" gap={1}>
        <Heading size="lg">สถิติ</Heading>
        <Text color="fg.muted">เลือกรายงานที่ต้องการดู</Text>
      </VStack>

      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
        {statisticsReports.map((report) => {
          const Icon = MODULE_ICONS[report.icon];
          return (
            <ChakraLink key={report.slug} asChild _hover={{ textDecoration: "none" }}>
              <NextLink href={report.href}>
                <GlassCard p={6} h="full" transition="box-shadow 0.15s" _hover={{ boxShadow: "md" }}>
                  <HStack gap={3} align="start">
                    <Circle size={10} bg="brand.subtle" color="brand.fg" flexShrink={0}>
                      <Icon size={20} />
                    </Circle>
                    <VStack align="start" gap={1}>
                      <Text fontWeight="semibold">{report.name}</Text>
                      <Text fontSize="sm" color="fg.muted">
                        {report.description}
                      </Text>
                    </VStack>
                  </HStack>
                </GlassCard>
              </NextLink>
            </ChakraLink>
          );
        })}
      </SimpleGrid>
    </VStack>
  );
}
