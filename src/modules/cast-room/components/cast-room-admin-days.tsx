"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  HStack,
  NativeSelect,
  Skeleton,
  Portal,
  Text,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import { Pencil, Plus, Printer, Trash2 } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { bangkokToday } from "@/lib/bangkok-date";
import { openPdfLink } from "@/lib/open-pdf-link";
import { isDutyMarker, type DutyMonthData } from "@/modules/duty-schedule/lib/duty-data";

import { createCastCaseLogPdfLink } from "../lib/cast-case-log-export";
import {
  deleteCastVisitForAdmin,
  listCastVisitsForAdmin,
  type CastVisitSummary,
} from "../lib/cast-dashboard-actions";
import { isWithinRecentMonths, toISO } from "../lib/thai-date";
import { CastVisitEditDialog } from "./cast-visit-edit-dialog";

const THAI_WD_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

type Loaded =
  | { key: string; status: "loading" }
  | { key: string; status: "ready"; visits: CastVisitSummary[] }
  | { key: string; status: "error"; error: string };

/** Visit time, else the log time, as HH:mm in Bangkok. */
function visitClock(visit: CastVisitSummary): string {
  if (visit.visitTime) return visit.visitTime;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(visit.createdAt));
}

function rosterName(raw: string | undefined): string | null {
  const name = raw?.trim();
  return name && !isDutyMarker(name) ? name : null;
}

/**
 * Admin dashboard tab: every cast-room case of the month, day by day, with
 * add, edit and delete, and the per-doctor case-log PDF. `month` is 0-based.
 */
export function CastRoomAdminDays({
  year,
  month,
  dutyData,
}: {
  year: number;
  month: number;
  dutyData: DutyMonthData | null;
}) {
  const key = `${year}-${month}`;
  const [loaded, setLoaded] = useState<Loaded>({ key: "", status: "loading" });
  const [, startLoad] = useTransition();
  const latestLoad = useRef(0);
  const [editing, setEditing] = useState<{ visit: CastVisitSummary | null; date: string } | null>(null);
  const [deleting, setDeleting] = useState<CastVisitSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [printDoctor, setPrintDoctor] = useState("");
  const [printError, setPrintError] = useState<string | null>(null);
  const [isPrinting, startPrint] = useTransition();

  const reload = useCallback(() => {
    const request = ++latestLoad.current;
    startLoad(async () => {
      setLoaded({ key, status: "loading" });
      try {
        const result = await listCastVisitsForAdmin(year, month + 1);
        if (latestLoad.current !== request) return;
        setLoaded(result.ok ? { key, status: "ready", visits: result.visits } : { key, status: "error", error: result.error });
      } catch {
        if (latestLoad.current !== request) return;
        setLoaded({ key, status: "error", error: "โหลดรายการห้องเฝือกไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  }, [key, year, month]);

  useEffect(() => {
    reload();
    return () => { latestLoad.current += 1; };
  }, [reload]);

  const visits = useMemo(
    () => (loaded.key === key && loaded.status === "ready" ? loaded.visits : null),
    [loaded, key],
  );
  const loadError = loaded.key === key && loaded.status === "error" ? loaded.error : null;

  const byDay = useMemo(() => {
    const map = new Map<number, CastVisitSummary[]>();
    for (const visit of visits ?? []) {
      const day = Number(visit.shiftDate.slice(8, 10));
      map.set(day, [...(map.get(day) ?? []), visit]);
    }
    for (const list of map.values()) list.sort((a, b) => visitClock(a).localeCompare(visitClock(b)));
    return map;
  }, [visits]);

  const doctors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const visit of visits ?? []) {
      if (visit.doctorName) counts.set(visit.doctorName, (counts.get(visit.doctorName) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => a[0].localeCompare(b[0], "th"));
  }, [visits]);
  const selectedDoctor = doctors.some(([name]) => name === printDoctor) ? printDoctor : "";
  // The case log is a finished month's claim: only the six months before this one.
  const printable = isWithinRecentMonths(year, month + 1, 6);
  const castTotal = (visits ?? []).reduce((sum, visit) => sum + visit.casts.reduce((n, cast) => n + cast.count, 0), 0);

  // Cases can only be logged up to today, so later days are left out.
  const today = bangkokToday();
  const monthIndex = year * 12 + month;
  const todayIndex = today.year * 12 + today.month;
  const lastDay = monthIndex > todayIndex ? 0 : monthIndex === todayIndex ? today.day : new Date(year, month + 1, 0).getDate();

  function handlePrint() {
    if (!selectedDoctor) return;
    setPrintError(null);
    startPrint(async () => {
      const error = await openPdfLink(async () => {
        const result = await createCastCaseLogPdfLink(year, month + 1, selectedDoctor);
        return result.ok ? { ok: true, url: result.pdfUrl } : result;
      });
      if (error) setPrintError(error);
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    startDelete(async () => {
      setDeleteError(null);
      const result = await deleteCastVisitForAdmin(target.visitId);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      setDeleting(null);
      reload();
    });
  }

  return (
    <VStack align="stretch" gap="1em">
      <GlassCard variant="solid" px="1.25em" py="1em">
        <Flex align="center" gap="1em" wrap="wrap">
          <VStack align="start" gap={0}>
            <Text fontSize="1.05em" fontWeight="bold">บันทึกห้องเฝือกเดือนนี้</Text>
            {visits ? (
              <Text fontSize="0.9em" color="fg.muted">
                {`${visits.length} ราย · เฝือก ${castTotal} ชิ้น`}
              </Text>
            ) : (
              <Skeleton h="1.2em" w="9em" mt="0.25em" />
            )}
          </VStack>
          <HStack ml="auto" gap="0.75em" wrap="wrap">
            <NativeSelect.Root size="lg" w="16em" disabled={!printable || !doctors.length || isPrinting}>
              <NativeSelect.Field
                aria-label="แพทย์สำหรับพิมพ์บันทึก"
                fontSize="0.95em"
                value={selectedDoctor}
                onChange={(event) => { setPrintDoctor(event.target.value); setPrintError(null); }}
              >
                <option value="">{doctors.length ? "เลือกแพทย์ที่จะพิมพ์" : "ยังไม่มีรายการ"}</option>
                {doctors.map(([name, count]) => (
                  <option key={name} value={name}>{name} ({count} ราย)</option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Button
              size="xl"
              fontSize="0.95em"
              colorPalette="brand"
              disabled={!printable || !selectedDoctor}
              loading={isPrinting}
              loadingText="กำลังเปิด PDF…"
              onClick={handlePrint}
            >
              <Printer size={22} /> พิมพ์บันทึก PDF
            </Button>
          </HStack>
        </Flex>
        {!printable && (
          <Text mt="0.5em" fontSize="0.9em" color="fg.muted">พิมพ์บันทึกได้เมื่อจบเดือนแล้ว (ย้อนหลังได้ 6 เดือน)</Text>
        )}
        {printError && <Text mt="0.5em" fontSize="0.9em" color="fg.error" role="alert">{printError}</Text>}
      </GlassCard>

      {!visits && loadError && (
        <VStack gap={3} py="2em" role="alert">
          <Text fontSize="1.1em" color="fg.error">{loadError}</Text>
          <Button size="lg" variant="outline" onClick={reload}>ลองอีกครั้ง</Button>
        </VStack>
      )}

      {!visits && !loadError && <TableSkeleton columns={1} rowHeight="3.2em" />}

      {visits && lastDay === 0 && (
        <Text fontSize="1.05em" color="fg.muted" textAlign="center" py="2em">
          ยังไม่ถึงเดือนนี้ จึงยังไม่มีรายการห้องเฝือก
        </Text>
      )}

      {visits && lastDay > 0 && (
        <GlassCard variant="solid" overflow="clip">
          {Array.from({ length: lastDay }, (_, i) => lastDay - i).map((day) => {
            const weekday = new Date(year, month, day).getDay();
            const info = dutyData?.[day];
            const holiday = !!info?.holiday;
            const weekend = weekday === 0 || weekday === 6;
            const dayColor = holiday ? "holiday.fg" : weekend ? "weekend.fg" : "fg";
            const doctor = rosterName(info?.entries.d1);
            const nurse = rosterName(info?.entries.d5);
            const list = byDay.get(day) ?? [];
            return (
              <Box key={day} borderTopWidth="2px" borderColor="border" _first={{ borderTopWidth: 0 }}>
                <Flex
                  align="center"
                  gap="1em"
                  px="1em"
                  py="0.6em"
                  bg={holiday ? "holiday.subtle" : weekend ? "weekend.subtle" : "bg.muted"}
                >
                  <HStack gap="0.5em" align="baseline" minW="9em">
                    <Text as="span" fontSize="1.5em" lineHeight="1.2" fontWeight="bold" fontFamily="var(--font-plex-sans)" color={dayColor}>
                      {day}
                    </Text>
                    <Text as="span" fontSize="0.95em" fontWeight="semibold" color={dayColor}>{THAI_WD_FULL[weekday]}</Text>
                  </HStack>
                  <Text fontSize="0.9em" color="fg.muted" truncate>
                    แพทย์เวร {doctor ?? "—"} · พยาบาล {nurse ?? "—"}
                  </Text>
                  <HStack ml="auto" gap="0.75em" flexShrink={0}>
                    <Text fontSize="0.95em" fontWeight="semibold" color={list.length ? "brand.fg" : "fg.muted"}>
                      {list.length ? `${list.length} ราย` : "ไม่มีรายการ"}
                    </Text>
                    <Button
                      size="lg"
                      fontSize="0.9em"
                      variant="outline"
                      colorPalette="brand"
                      bg="bg"
                      onClick={() => setEditing({ visit: null, date: toISO(year, month, day) })}
                    >
                      <Plus size={20} /> เพิ่ม
                    </Button>
                  </HStack>
                </Flex>
                {list.map((visit) => (
                  <Flex key={visit.visitId} align="center" gap="1em" px="1em" py="0.6em" borderTopWidth="1px" borderColor="border">
                    <Text w="3.5em" flexShrink={0} fontSize="0.95em" fontFamily="var(--font-plex-sans)" color="fg.muted">
                      {visitClock(visit)}
                    </Text>
                    <Box flex="1" minW={0}>
                      <HStack gap="0.75em" align="baseline">
                        <Text fontSize="1em" fontWeight="semibold" truncate>{visit.patientName}</Text>
                        <Text fontSize="0.9em" color="fg.muted" flexShrink={0}>HN {visit.hn}</Text>
                      </HStack>
                      <Text fontSize="0.9em" color="fg.muted" truncate>
                        {visit.diagnosis}{visit.doctorName ? ` · ${visit.doctorName}` : ""}
                      </Text>
                    </Box>
                    <Wrap gap="0.4em" maxW="40%" justify="flex-end">
                      {visit.casts.map((cast) => (
                        <Badge key={cast.id} colorPalette="brand" variant="subtle" borderRadius="full" fontSize="0.8em" px="0.7em" py="0.15em">
                          {cast.label}{cast.count > 1 ? ` ×${cast.count}` : ""}
                        </Badge>
                      ))}
                    </Wrap>
                    <HStack gap="0.5em" flexShrink={0}>
                      <Button size="lg" fontSize="0.9em" variant="outline" onClick={() => setEditing({ visit, date: visit.shiftDate })}>
                        <Pencil size={18} /> แก้ไข
                      </Button>
                      <Button
                        size="lg"
                        fontSize="0.9em"
                        variant="outline"
                        colorPalette="red"
                        onClick={() => { setDeleteError(null); setDeleting(visit); }}
                      >
                        <Trash2 size={18} /> ลบ
                      </Button>
                    </HStack>
                  </Flex>
                ))}
              </Box>
            );
          })}
        </GlassCard>
      )}

      <CastVisitEditDialog
        visit={editing?.visit ?? null}
        createDate={editing?.date ?? null}
        open={!!editing}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        onSaved={reload}
      />

      <Dialog.Root
        open={!!deleting}
        onOpenChange={(event) => {
          if (!event.open && !isDeleting) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
      >
        <Portal>
          <Dialog.Backdrop backdropFilter="blur(4px)" />
          <Dialog.Positioner p={4}>
            <Dialog.Content maxW="md" w="full" bg="glass.solid" backdropFilter="blur(16px)" borderWidth="1px" borderColor="glass.border">
              <Dialog.Header>
                <Dialog.Title fontSize="xl">ยืนยันการลบ</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack align="stretch" gap={3}>
                  <Text fontSize="lg">
                    ต้องการลบรายการของ{" "}
                    <Text as="span" fontWeight="semibold">{deleting?.patientName}</Text>{" "}
                    (HN {deleting?.hn}) หรือไม่?
                  </Text>
                  <Text color="fg.muted">การลบนี้ไม่สามารถย้อนกลับได้</Text>
                  {deleteError && (
                    <Alert.Root status="error">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{deleteError}</Alert.Description>
                      </Alert.Content>
                    </Alert.Root>
                  )}
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button size="lg" variant="ghost" onClick={() => setDeleting(null)} disabled={isDeleting}>ยกเลิก</Button>
                <Button size="lg" colorPalette="red" onClick={confirmDelete} loading={isDeleting}>ลบ</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </VStack>
  );
}
