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
    <ChakraLink asChild _hover={{ textDecoration: "none" }} display="block" mx="auto" w="full" maxW="md">
      <NextLink href="/duty-schedule">
        <GlassCard
          p={0}
          overflow="hidden"
          transition="transform 0.18s ease, box-shadow 0.18s ease"
          _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
          _active={{ transform: "translateY(0)" }}
        >
          <VStack
            align="stretch"
            gap={0.5}
            px={5}
            pt={3}
            pb={2.5}
            bg="brand.subtle"
            borderBottomWidth="2px"
            borderColor="brand.muted"
          >
            <Text fontSize="sm" fontWeight="bold" color="brand.fg" letterSpacing="wide">
              เวรวันนี้
            </Text>
            <Text fontSize="xs" fontWeight="medium" color="brand.fg">
              {thaiTodayLabel(year, month, day)}
            </Text>
          </VStack>

          <VStack align="stretch" gap={0} px={5} py={2}>
            {HOME_DUTY_KEYS.map((key) => {
              const Icon = DUTY_ICONS[key];
              const name = duty.entries[key];
              const muted = !name || isDutyMarker(name);
              return (
                <HStack
                  key={key}
                  gap={3}
                  py={3.5}
                  borderTopWidth="1px"
                  borderColor="glass.border"
                  _first={{ borderTopWidth: 0 }}
                >
                  <Box color={DUTY_ICON_COLORS[key]} flexShrink={0}>
                    <Icon size={22} />
                  </Box>
                  <VStack align="start" gap={0.5} flex="1" minW={0}>
                    <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
                      {DUTY_LABELS[key]}
                    </Text>
                    <Text
                      fontSize="2xl"
                      fontWeight="bold"
                      lineHeight="short"
                      color={muted ? "fg.muted" : DUTY_ICON_COLORS[key]}
                    >
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
