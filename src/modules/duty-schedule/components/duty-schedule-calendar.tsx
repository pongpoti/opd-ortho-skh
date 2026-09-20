"use client";

import { useRef, useState } from "react";
import {
  Box,
  Drawer,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { DUTY_LABELS, DUTY_ORDER, dutyApplies, getDutyDay } from "../lib/duty-data";
import { DUTY_ICONS } from "../lib/duty-icons";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_WD_SHORT = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const THAI_WD_FULL = [
  "วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์",
];
const BE_OFFSET = 543;
const SWIPE_THRESHOLD = 55;

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday-first weekday index: 0=Mon .. 6=Sun. */
function mondayIndex(jsDay: number) {
  return (jsDay + 6) % 7;
}

type Cell = { year: number; month: number; day: number; outside: boolean };

function buildCells(year: number, month: number): Cell[] {
  const n = daysInMonth(year, month);
  const firstWd = mondayIndex(new Date(year, month, 1).getDay());
  const prevMonth = month - 1 < 0 ? 11 : month - 1;
  const prevYear = month - 1 < 0 ? year - 1 : year;
  const prevDays = daysInMonth(prevYear, prevMonth);
  const nextMonth = month + 1 > 11 ? 0 : month + 1;
  const nextYear = month + 1 > 11 ? year + 1 : year;

  const cells: Cell[] = [];
  for (let i = 0; i < firstWd; i++) {
    cells.push({ year: prevYear, month: prevMonth, day: prevDays - firstWd + 1 + i, outside: true });
  }
  for (let d = 1; d <= n; d++) cells.push({ year, month, day: d, outside: false });
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ year: nextYear, month: nextMonth, day: nextDay++, outside: true });
  }
  return cells;
}

export function DutyScheduleCalendar() {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState<{ year: number; month: number; day: number } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function changeMonth(delta: number) {
    setView((v) => {
      let month = v.month + delta;
      let year = v.year;
      if (month < 0) { month = 11; year -= 1; }
      if (month > 11) { month = 0; year += 1; }
      return { year, month };
    });
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dy = e.changedTouches[0].clientY - start.y;
    const dx = e.changedTouches[0].clientX - start.x;
    if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
      changeMonth(dy < 0 ? 1 : -1);
    }
  }

  const wheelLock = useRef(false);
  function handleWheel(e: React.WheelEvent) {
    if (Math.abs(e.deltaY) < 24 || wheelLock.current) return;
    wheelLock.current = true;
    changeMonth(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => { wheelLock.current = false; }, 500);
  }

  const cells = buildCells(view.year, view.month);
  const selectedDuty = selected ? getDutyDay(selected.year, selected.month, selected.day) : null;
  const selectedWeekday = selected ? new Date(selected.year, selected.month, selected.day).getDay() : 0;

  return (
    <VStack align="stretch" gap={4}>
      <Flex align="center" justify="space-between">
        <Heading size="2xl" textShadow="heading">
          {THAI_MONTHS[view.month]}{" "}
          <Text as="span" fontSize="lg" fontWeight="medium" color="fg.muted">
            {view.year + BE_OFFSET}
          </Text>
        </Heading>
        <HStack gap={2}>
          <IconButton aria-label="เดือนก่อนหน้า" size="sm" variant="outline" onClick={() => changeMonth(-1)}>
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton aria-label="เดือนถัดไป" size="sm" variant="outline" onClick={() => changeMonth(1)}>
            <ChevronRight size={16} />
          </IconButton>
        </HStack>
      </Flex>

      <GlassCard p={6} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>
        <Grid templateColumns="repeat(7, 1fr)" gap={1} mb={3}>
          {THAI_WD_SHORT.map((wd) => (
            <Text key={wd} textAlign="center" fontSize="sm" fontWeight="bold" color="fg.muted">
              {wd}
            </Text>
          ))}
        </Grid>
        <Grid templateColumns="repeat(7, 1fr)" gap={2}>
          {cells.map((cell) => {
            const weekday = new Date(cell.year, cell.month, cell.day).getDay();
            const isWeekend = weekday === 0 || weekday === 6;
            const duty = !cell.outside ? getDutyDay(cell.year, cell.month, cell.day) : null;
            const isHoliday = !!duty?.holiday;
            const isToday =
              !cell.outside &&
              cell.year === now.getFullYear() &&
              cell.month === now.getMonth() &&
              cell.day === now.getDate();

            return (
              <Box
                key={`${cell.year}-${cell.month}-${cell.day}-${cell.outside}`}
                as="button"
                onClick={() => !cell.outside && setSelected({ year: cell.year, month: cell.month, day: cell.day })}
                w="full"
                minH="58px"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontFamily="var(--font-plex-sans)"
                fontWeight="semibold"
                fontSize="md"
                bg={cell.outside ? "transparent" : isHoliday ? "holiday.subtle" : isWeekend ? "weekend.subtle" : "card.cell"}
                color={cell.outside ? "fg.muted" : isHoliday ? "holiday.fg" : isWeekend ? "weekend.fg" : "fg"}
                opacity={cell.outside ? 0.5 : 1}
                borderWidth={isToday ? "2px" : "1px"}
                borderColor={isToday ? "brand.solid" : "card.border"}
                cursor={cell.outside ? "default" : "pointer"}
                _active={cell.outside ? undefined : { transform: "scale(0.94)" }}
              >
                {cell.day}
              </Box>
            );
          })}
        </Grid>
      </GlassCard>

      <Text fontSize="xs" color="fg.muted" textAlign="center">
        แตะวันที่เพื่อดูรายละเอียด
      </Text>

      <Drawer.Root
        placement="bottom"
        open={!!selected}
        onOpenChange={(e) => { if (!e.open) setSelected(null); }}
      >
        <Portal>
          <Drawer.Backdrop backdropFilter="blur(4px)" />
          <Drawer.Positioner>
            <Drawer.Content
              bg="card.solid"
              borderTopWidth="1px"
              borderColor="card.border"
              borderRadius="20px 20px 0 0"
              boxShadow="0 -8px 32px rgba(15, 23, 32, 0.16)"
              maxH="80vh"
            >
              <Drawer.Header display="flex" alignItems="flex-start" justifyContent="space-between" gap={3}>
                <VStack align="start" gap={0}>
                  <Drawer.Title fontSize="xl">
                    {selected ? `${selected.day} ${THAI_MONTHS[selected.month]}` : ""}
                  </Drawer.Title>
                  {selected && (
                    <Text fontSize="sm" color="fg.muted">
                      {THAI_WD_FULL[selectedWeekday]} · พ.ศ. {selected.year + BE_OFFSET}
                    </Text>
                  )}
                </VStack>
                <Drawer.CloseTrigger asChild>
                  <IconButton aria-label="ปิด" size="sm" variant="ghost" borderRadius="full">
                    <X size={16} />
                  </IconButton>
                </Drawer.CloseTrigger>
              </Drawer.Header>
              <Drawer.Body>
                {selectedDuty?.holiday && (
                  <Text
                    display="inline-block"
                    fontSize="xs"
                    fontWeight="bold"
                    color="holiday.fg"
                    bg="holiday.subtle"
                    px={3}
                    py={1}
                    borderRadius="full"
                    mb={3}
                  >
                    วันหยุดพิเศษ — แพทย์คนเดิมครอบคลุมหลายวัน
                  </Text>
                )}
                <VStack align="stretch" gap={0}>
                  {DUTY_ORDER.filter((key) => dutyApplies(key, selectedWeekday)).map((key) => {
                    const Icon = DUTY_ICONS[key];
                    const name = selectedDuty?.entries[key];
                    return (
                      <HStack key={key} gap={3} py={3} borderTopWidth="1px" borderColor="card.border" _first={{ borderTopWidth: 0 }}>
                        <Box color="fg.muted" flexShrink={0}>
                          <Icon size={18} />
                        </Box>
                        <VStack align="start" gap={0} flex="1" minW={0}>
                          <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
                            {DUTY_LABELS[key]}
                          </Text>
                          <Text fontSize="md" fontWeight="semibold" color={name ? "fg" : "fg.muted"}>
                            {name ?? "ยังไม่ระบุ"}
                          </Text>
                        </VStack>
                      </HStack>
                    );
                  })}
                </VStack>
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </VStack>
  );
}
