import { Box, HStack, Skeleton } from "@chakra-ui/react";

import { GlassCard } from "@/components/ui/glass-card";

type TableSkeletonProps = {
  /** Number of placeholder rows. */
  rows?: number;
  /** Data columns after the day column. */
  columns?: number;
  rowHeight?: string;
};

/** Placeholder for the day-by-day admin tables while a month loads. */
export function TableSkeleton({ rows = 10, columns = 3, rowHeight = "4.4em" }: TableSkeletonProps) {
  return (
    <GlassCard variant="solid" overflow="clip" aria-busy role="status" aria-label="กำลังโหลด">
      {Array.from({ length: rows }, (_, row) => (
        <HStack
          key={row}
          h={rowHeight}
          px="0.75em"
          gap="1em"
          borderTopWidth={row === 0 ? 0 : "2px"}
          borderColor="border"
        >
          <Skeleton h="1.6em" w="12%" flexShrink={0} />
          {Array.from({ length: columns }, (_, col) => (
            <Box key={col} flex="1" minW={0}>
              <Skeleton h="2.4em" w="full" borderRadius="lg" />
            </Box>
          ))}
        </HStack>
      ))}
    </GlassCard>
  );
}
