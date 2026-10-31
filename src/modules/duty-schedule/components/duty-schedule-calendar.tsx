"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Box,
  Button,
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
import { ChevronLeft, ChevronRight, Pencil, Printer, Trash2, X } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { ensureLiffInitWithTimeout, liff } from "@/lib/liff-client";
import {
  ambiguousDutyFirstNamesByKey,
  DUTY_LABELS,
  DUTY_ORDER,
  dutyApplies,
  formatDutyDisplayName,
  getDutyDay,
  isDutyMarker,
  isDutyMonthDisabled,
  type DutyKey,
  type DutyMonthData,
} from "../lib/duty-data";
import { DUTY_ICON_COLORS, DUTY_ICONS } from "../lib/duty-icons";
import { loadDutyMonthData, getDutyScheduleAdminFlag } from "../lib/duty-actions";
import { createDutyPrintPdfLink } from "../lib/duty-print-actions";
import { createSecondCallPdfLink } from "../lib/second-call-actions";
import { DutySlotDeleteDialog } from "./duty-slot-delete-dialog";
import { DutySlotEditSheet } from "./duty-slot-edit-sheet";

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
const EMPTY_MONTH: DutyMonthData = {};

type LoadedMonth =
  | { key: string; status: "loading" }
  | { key: string; status: "ready"; data: DutyMonthData }
  | { key: string; status: "error"; error: string };

function monthKey(year: number, month: number) {
  return `${year}-${month}`;
}

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

type DutyScheduleCalendarProps = {
  isAdmin?: boolean;
};

export function DutyScheduleCalendar({ isAdmin: isAdminProp }: DutyScheduleCalendarProps) {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState<{ year: number; month: number; day: number } | null>(null);
  // Day numbers are month-scoped; never display a previous month's response.
  const [loadedMonth, setLoadedMonth] = useState<LoadedMonth>({ key: "", status: "loading" });
  const latestLoad = useRef(0);
  const currentMonthKey = monthKey(view.year, view.month);
  const monthReady = loadedMonth.key === currentMonthKey && loadedMonth.status === "ready";
  const monthData = monthReady && loadedMonth.status === "ready" ? loadedMonth.data : EMPTY_MONTH;
  const loadError = loadedMonth.key === currentMonthKey && loadedMonth.status === "error"
    ? loadedMonth.error
    : null;
  const [adminFromServer, setAdminFromServer] = useState(false);
  const isAdmin = !!isAdminProp || adminFromServer;
  const [printMessage, setPrintMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [isPrinting, startPrint] = useTransition();
  const [isExportingSecondCall, startSecondCallExport] = useTransition();
  const [, startLoadMonth] = useTransition();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const [editTarget, setEditTarget] = useState<{
    year: number;
    month: number;
    day: number;
    dutyKey: DutyKey;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    year: number;
    month: number;
    day: number;
    dutyKey: DutyKey;
    personName: string;
  } | null>(null);

  const monthDisabled = isDutyMonthDisabled(view.year, view.month);

  const reloadMonthData = useCallback((year: number, month: number) => {
    const key = monthKey(year, month);
    const request = ++latestLoad.current;
    startLoadMonth(async () => {
      setLoadedMonth({ key, status: "loading" });
      try {
        const result = await loadDutyMonthData(year, month);
        // Fast swipes and retries can resolve out of order, including two
        // requests for the same month. Only the newest request may land.
        if (latestLoad.current !== request) return;
        setLoadedMonth(result.ok
          ? { key, status: "ready", data: result.data }
          : { key, status: "error", error: result.error });
      } catch {
        if (latestLoad.current !== request) return;
        setLoadedMonth({ key, status: "error", error: "โหลดตารางเวรไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  }, []);

  useEffect(() => {
    reloadMonthData(view.year, view.month);
    return () => { latestLoad.current += 1; };
  }, [view.year, view.month, reloadMonthData]);

  useEffect(() => {
    if (isAdminProp) return;
    let cancelled = false;
    getDutyScheduleAdminFlag()
      .then((flag) => {
        if (!cancelled) setAdminFromServer(flag);
      })
      .catch(() => {
        if (!cancelled) setAdminFromServer(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdminProp]);

  /** Open a signed PDF link: external browser from LIFF, same tab elsewhere. */
  async function openPdf(createLink: typeof createSecondCallPdfLink) {
    const { year, month } = view;
    setPrintMessage(null);
    try {
      const result = await createLink(year, month);
      if (!result.ok) {
        setPrintMessage({ tone: "err", text: result.error });
        return;
      }
      const url = new URL(result.path, window.location.origin).toString();
      try {
        await ensureLiffInitWithTimeout();
        if (liff.isInClient()) {
          liff.openWindow({ url, external: true });
          return;
        }
      } catch {
        // Open the signed HTTP download directly in ordinary browsers.
      }
      window.location.assign(url);
    } catch {
      setPrintMessage({ tone: "err", text: "เปิด PDF ไม่สำเร็จ กรุณาลองอีกครั้ง" });
    }
  }

  function handlePrint() {
    if (!monthReady) return;
    startPrint(() => openPdf(createDutyPrintPdfLink));
  }

  function handleSecondCall() {
    if (!monthReady) return;
    startSecondCallExport(() => openPdf(createSecondCallPdfLink));
  }

  function changeMonth(delta: number) {
    setSelected(null);
    setEditTarget(null);
    setDeleteTarget(null);
    setPrintMessage(null);
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
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      changeMonth(dx < 0 ? 1 : -1);
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
  const selectedDuty = selected && monthReady
    ? getDutyDay(selected.year, selected.month, selected.day, monthData)
    : null;
  const selectedWeekday = selected
    ? new Date(selected.year, selected.month, selected.day).getDay()
    : 0;
  const ambiguousByKey = selected && monthReady
    ? ambiguousDutyFirstNamesByKey(selected.year, selected.month, DUTY_ORDER, monthData)
    : null;

  function afterMutation() {
    reloadMonthData(view.year, view.month);
  }

  return (
    <VStack align="stretch" gap={4}>
      <Flex align="center" justify="space-between">
        <Heading size="lg">
          {THAI_MONTHS[view.month]}{" "}
          <Text as="span" fontSize="sm" fontWeight="medium" color="fg.muted">
            {view.year + BE_OFFSET}
          </Text>
        </Heading>
        <HStack gap={2}>
          <IconButton
            aria-label="ตารางเวร second-call"
            size="md"
            variant="solid"
            colorPalette="brand"
            onClick={handleSecondCall}
            disabled={isExportingSecondCall || !monthReady || monthDisabled}
            loading={isExportingSecondCall}
          >
            <Text as="span" fontSize="md" fontWeight="bold" lineHeight="1">
              2<Text as="sup" fontSize="10px" ml="1px">nd</Text>
            </Text>
          </IconButton>
          <IconButton
            aria-label="พิมพ์ตารางเวร (PDF)"
            size="md"
            variant="solid"
            colorPalette="brand"
            onClick={handlePrint}
            disabled={isPrinting || !monthReady || monthDisabled}
            loading={isPrinting}
          >
            <Printer size={20} />
          </IconButton>
          <IconButton aria-label="เดือนก่อนหน้า" size="md" variant="outline" onClick={() => changeMonth(-1)}>
            <ChevronLeft size={20} />
          </IconButton>
          <IconButton aria-label="เดือนถัดไป" size="md" variant="outline" onClick={() => changeMonth(1)}>
            <ChevronRight size={20} />
          </IconButton>
        </HStack>
      </Flex>

      {!monthReady && (
        <VStack gap={2} role={loadError ? "alert" : "status"}>
          <Text fontSize="sm" color={loadError ? "holiday.fg" : "fg.muted"} textAlign="center">
            {loadError ?? "กำลังโหลดตารางเวร…"}
          </Text>
          {loadError && (
            <Button size="sm" variant="outline" onClick={() => reloadMonthData(view.year, view.month)}>
              ลองอีกครั้ง
            </Button>
          )}
        </VStack>
      )}

      {printMessage && (
        <Text
          fontSize="sm"
          textAlign="center"
          color={printMessage.tone === "ok" ? "brand.fg" : "holiday.fg"}
          bg={printMessage.tone === "ok" ? "brand.subtle" : "holiday.subtle"}
          borderRadius="md"
          px={3}
          py={2}
        >
          {printMessage.text}
        </Text>
      )}

      <GlassCard
        p={4}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{ touchAction: "pan-y", overscrollBehaviorX: "contain" }}
      >
        <Grid templateColumns="repeat(7, 1fr)" gap={1} mb={2}>
          {THAI_WD_SHORT.map((wd) => (
            <Text key={wd} textAlign="center" fontSize="11px" fontWeight="bold" color="fg.muted">
              {wd}
            </Text>
          ))}
        </Grid>
        <Grid templateColumns="repeat(7, 1fr)" gap={1.5}>
          {cells.map((cell) => {
            const weekday = new Date(cell.year, cell.month, cell.day).getDay();
            const isWeekend = weekday === 0 || weekday === 6;
            const duty = !cell.outside && monthReady
              ? getDutyDay(cell.year, cell.month, cell.day, monthData)
              : null;
            const isHoliday = !!duty?.holiday;
            const isToday =
              !cell.outside &&
              cell.year === now.getFullYear() &&
              cell.month === now.getMonth() &&
              cell.day === now.getDate();
            const dayDisabled = cell.outside || !monthReady || isDutyMonthDisabled(cell.year, cell.month);

            return (
              <Box
                key={`${cell.year}-${cell.month}-${cell.day}-${cell.outside}`}
                as="button"
                onClick={() => {
                  if (dayDisabled) return;
                  setSelected({ year: cell.year, month: cell.month, day: cell.day });
                }}
                aria-disabled={dayDisabled || undefined}
                aspectRatio={1}
                w="full"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontFamily="var(--font-plex-sans)"
                fontWeight="semibold"
                fontSize="sm"
                bg={
                  cell.outside
                    ? "transparent"
                    : isHoliday
                      ? "holiday.subtle"
                      : isWeekend
                        ? "weekend.subtle"
                        : "bg.panel"
                }
                color={
                  cell.outside || dayDisabled
                    ? "fg.muted"
                    : isHoliday
                      ? "holiday.fg"
                      : isWeekend
                        ? "weekend.fg"
                        : "fg"
                }
                opacity={cell.outside || dayDisabled ? 0.4 : 1}
                borderWidth={isToday && !dayDisabled ? "2px" : "1px"}
                borderColor={isToday && !dayDisabled ? "brand.solid" : "glass.border"}
                cursor={dayDisabled ? "not-allowed" : "pointer"}
                pointerEvents={dayDisabled ? "none" : "auto"}
                _active={dayDisabled ? undefined : { transform: "scale(0.94)" }}
              >
                {cell.day}
              </Box>
            );
          })}
        </Grid>
      </GlassCard>

      {monthDisabled && (
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          เริ่มใช้งานตารางเวรตั้งแต่กันยายน 2569
        </Text>
      )}

      <VStack gap={0.5}>
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          แตะวันที่เพื่อดูรายละเอียด
        </Text>
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          ปัดซ้าย-ขวาเพื่อเปลี่ยนเดือน
        </Text>
      </VStack>

      <Drawer.Root
        placement="bottom"
        open={!!selected}
        onOpenChange={(e) => { if (!e.open) setSelected(null); }}
      >
        <Portal>
          <Drawer.Backdrop backdropFilter="blur(4px)" />
          <Drawer.Positioner>
            <Drawer.Content bg="glass.solid" backdropFilter="blur(16px)" borderTopWidth="1px" borderColor="glass.border" borderRadius="20px 20px 0 0" maxH="80vh">
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
              <Drawer.Body overflowY="auto" pb="max(1.5rem, calc(1rem + env(safe-area-inset-bottom)))">
                {!monthReady && (
                  <VStack role={loadError ? "alert" : "status"} py={4} gap={3}>
                    <Text textAlign="center" color={loadError ? "holiday.fg" : "fg.muted"}>
                      {loadError ?? "กำลังโหลดตารางเวร…"}
                    </Text>
                    {loadError && (
                      <Button size="sm" variant="outline" onClick={() => reloadMonthData(view.year, view.month)}>
                        ลองอีกครั้ง
                      </Button>
                    )}
                  </VStack>
                )}
                {selectedDuty?.holiday && (
                  <Text
                    display="inline-block"
                    maxW="100%"
                    truncate
                    title={selectedDuty.holidayLabel ?? undefined}
                    fontSize="xs"
                    fontWeight="bold"
                    color="holiday.fg"
                    bg="holiday.subtle"
                    px={3}
                    py={1}
                    borderRadius="full"
                    mb={3}
                  >
                    {selectedDuty.holidayLabel ?? "วันหยุดพิเศษ — แพทย์คนเดิมครอบคลุมหลายวัน"}
                  </Text>
                )}
                {monthReady && <VStack align="stretch" gap={0}>
                  {DUTY_ORDER.filter((key) => dutyApplies(key, selectedWeekday)).map((key) => {
                    const Icon = DUTY_ICONS[key];
                    const name = selectedDuty?.entries[key];
                    const muted = !name || isDutyMarker(name);
                    const canDelete = isAdmin && !!name && name !== "-";
                    return (
                      <HStack key={key} gap={3} py={4} borderTopWidth="1px" borderColor="glass.border" _first={{ borderTopWidth: 0 }}>
                        <Box color={DUTY_ICON_COLORS[key]} flexShrink={0}>
                          <Icon size={20} />
                        </Box>
                        <VStack align="start" gap={2.5} flex="1" minW={0}>
                          <Text fontSize="md" lineHeight="1.5" fontWeight="medium" color="fg.muted">
                            {DUTY_LABELS[key]}
                          </Text>
                          <Text fontSize="22px" lineHeight="1.6" fontWeight="semibold" color={muted ? "fg.muted" : "fg"}>
                            {formatDutyDisplayName(name, ambiguousByKey?.[key])}
                          </Text>
                        </VStack>
                        {isAdmin && selected && (
                          <HStack gap={0} flexShrink={0}>
                            <IconButton
                              aria-label={`แก้ไข${DUTY_LABELS[key]}`}
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setEditTarget({
                                  year: selected.year,
                                  month: selected.month,
                                  day: selected.day,
                                  dutyKey: key,
                                })
                              }
                            >
                              <Pencil size={16} />
                            </IconButton>
                            {canDelete && (
                              <IconButton
                                aria-label={`ลบ${DUTY_LABELS[key]}`}
                                size="sm"
                                variant="ghost"
                                colorPalette="red"
                                onClick={() =>
                                  setDeleteTarget({
                                    year: selected.year,
                                    month: selected.month,
                                    day: selected.day,
                                    dutyKey: key,
                                    personName: formatDutyDisplayName(name, ambiguousByKey?.[key]),
                                  })
                                }
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            )}
                          </HStack>
                        )}
                      </HStack>
                    );
                  })}
                </VStack>}
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>

      {editTarget && monthReady && (
        <DutySlotEditSheet
          open={!!editTarget}
          onOpenChange={(open) => { if (!open) setEditTarget(null); }}
          year={editTarget.year}
          month={editTarget.month}
          day={editTarget.day}
          dutyKey={editTarget.dutyKey}
          currentName={getDutyDay(editTarget.year, editTarget.month, editTarget.day, monthData).entries[editTarget.dutyKey]}
          onSaved={afterMutation}
        />
      )}

      {deleteTarget && (
        <DutySlotDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          year={deleteTarget.year}
          month={deleteTarget.month}
          day={deleteTarget.day}
          dutyKey={deleteTarget.dutyKey}
          personName={deleteTarget.personName}
          onDeleted={afterMutation}
        />
      )}
    </VStack>
  );
}
