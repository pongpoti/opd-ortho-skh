import NextLink from "next/link";
import { Box, HStack, Link as ChakraLink, Text, VStack } from "@chakra-ui/react";

import { GlassCard } from "@/components/ui/glass-card";
import { THAI_MONTHS } from "@/modules/cast-room/lib/thai-date";
import {
  DUTY_LABELS,
  formatDutyDisplayName,
  getDutyDay,
  isDutyMarker,
  type DutyKey,
} from "@/modules/duty-schedule/lib/duty-data";
import { DUTY_ICON_COLORS, DUTY_ICONS } from "@/modules/duty-schedule/lib/duty-icons";

const HOME_DUTY_KEYS: DutyKey[] = ["d1", "d2"];

const THAI_WD_FULL = [
  "วันอาทิตย์",
  "วันจันทร์",
  "วันอังคาร",
  "วันพุธ",
  "วันพฤหัสบดี",
  "วันศุกร์",
  "วันเสาร์",
];
const BE_OFFSET = 543;

/** Calendar Y/M/D in Asia/Bangkok (hospital local time). */
export function bangkokToday(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: num("year"), month: num("month") - 1, day: num("day") };
}

function thaiTodayLabel(year: number, month: number, day: number): string {
  const weekday = new Date(year, month, day).getDay();
  return `${THAI_WD_FULL[weekday]}ที่ ${day} ${THAI_MONTHS[month]} พ.ศ. ${year + BE_OFFSET}`;
}

/** Today's staff + intern roster, linking through to the full duty calendar. */
export function TodayDuty() {
  const { year, month, day } = bangkokToday();
  const duty = getDutyDay(year, month, day);

  return (
    <ChakraLink asChild _hover={{ textDecoration: "none" }}>
      <NextLink href="/duty-schedule">
        <GlassCard
          p={5}
          transition="transform 0.18s ease, box-shadow 0.18s ease"
          _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
          _active={{ transform: "translateY(0)" }}
        >
          <VStack align="stretch" gap={0.5} mb={3}>
            <Text fontSize="sm" fontWeight="semibold" color="fg.muted">
              เวรวันนี้
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {thaiTodayLabel(year, month, day)}
            </Text>
          </VStack>

          <VStack align="stretch" gap={0}>
            {HOME_DUTY_KEYS.map((key) => {
              const Icon = DUTY_ICONS[key];
              const name = duty.entries[key];
              const muted = !name || isDutyMarker(name);
              return (
                <HStack
                  key={key}
                  gap={3}
                  py={3}
                  borderTopWidth="1px"
                  borderColor="glass.border"
                  _first={{ borderTopWidth: 0, pt: 0 }}
                >
                  <Box color={DUTY_ICON_COLORS[key]} flexShrink={0}>
                    <Icon size={18} />
                  </Box>
                  <VStack align="start" gap={0} flex="1" minW={0}>
                    <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
                      {DUTY_LABELS[key]}
                    </Text>
                    <Text fontSize="md" fontWeight="semibold" color={muted ? "fg.muted" : "fg"}>
                      {formatDutyDisplayName(name)}
                    </Text>
                  </VStack>
                </HStack>
              );
            })}
          </VStack>
        </GlassCard>
      </NextLink>
    </ChakraLink>
  );
}
