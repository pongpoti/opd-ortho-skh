"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  NativeSelect,
  Text,
  VStack,
} from "@chakra-ui/react";
import { CalendarSync, ChevronLeft, ChevronRight, Monitor, RotateCcw, Save } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import {
  DUTY_LABELS,
  DUTY_ORDER,
  dutyApplies,
  isDutyMarker,
  type DutyKey,
  type DutyMonthData,
} from "../lib/duty-data";
import { DUTY_ICON_COLORS, DUTY_ICONS } from "../lib/duty-icons";
import {
  loadPlannerMonth,
  refreshPlannerHolidays,
  savePlannerChanges,
  type PlannerOption,
  type PlannerRosters,
} from "../lib/planner-actions";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_WD_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const BE_OFFSET = 543;

const DUTY_ROLE: Record<DutyKey, keyof PlannerRosters> = {
  d1: "staff", d2: "intern", d3: "staff", d4: "staff", d5: "nurse",
};

/** Base text sizes for the "ขนาดตัวอักษร" switch; everything scales with em. */
const TEXT_SIZES = [
  { label: "ปกติ", px: 18 },
  { label: "ใหญ่", px: 21 },
  { label: "ใหญ่มาก", px: 24 },
] as const;
const TEXT_SIZE_KEY = "opd-planner-text-size";
const DEFAULT_TEXT_SIZE: number = TEXT_SIZES[1].px;
const textSizeListeners = new Set<() => void>();

/** Remembered text size; storage can be blocked, so fall back to the default. */
function readTextSize(): number {
  try {
    const stored = Number(window.localStorage.getItem(TEXT_SIZE_KEY));
    return TEXT_SIZES.some((size) => size.px === stored) ? stored : DEFAULT_TEXT_SIZE;
  } catch {
    return DEFAULT_TEXT_SIZE;
  }
}

function writeTextSize(px: number) {
  try {
    window.localStorage.setItem(TEXT_SIZE_KEY, String(px));
  } catch {
    // Ignore: the choice just won't be remembered.
  }
  textSizeListeners.forEach((listener) => listener());
}

function subscribeTextSize(listener: () => void) {
  textSizeListeners.add(listener);
  return () => { textSizeListeners.delete(listener); };
}

/** OPD columns are mostly "ไม่มีเวร", so names get the room. */
const COLUMN_WIDTHS: Record<DutyKey, string> = {
  d1: "21%", d2: "21%", d3: "14%", d4: "14%", d5: "18%",
};

/** Value of the empty option: a slot nobody has filled yet. */
const UNSET = "";

type Loaded =
  | { key: string; status: "loading" }
  | { key: string; status: "ready"; data: DutyMonthData; rosters: PlannerRosters }
  | { key: string; status: "error"; error: string };

type Notice = { tone: "ok" | "err"; text: string } | null;

const monthKey = (year: number, month: number) => `${year}-${month}`;
const slotKey = (day: number, key: DutyKey) => `${day}:${key}`;
const daysIn = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

function shiftMonth(view: { year: number; month: number }, delta: number) {
  const total = view.year * 12 + view.month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** Options for one slot, keeping a saved name that is no longer on the roster. */
function slotOptions(roster: PlannerOption[], saved: string | undefined): PlannerOption[] {
  if (!saved || isDutyMarker(saved) || roster.some((option) => option.value === saved)) return roster;
  return [{ value: saved, label: `${saved} (ไม่อยู่ในรายชื่อ)` }, ...roster];
}

function optionLabel(roster: PlannerOption[], value: string): string {
  return roster.find((option) => option.value === value)?.label ?? value;
}

export function DutyPlanner({ initialYear, initialMonth }: { initialYear: number; initialMonth: number }) {
  const [view, setView] = useState({ year: initialYear, month: initialMonth });
  const [loaded, setLoaded] = useState<Loaded>({ key: "", status: "loading" });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [holidayNotice, setHolidayNotice] = useState<Notice>(null);
  const textSize = useSyncExternalStore(subscribeTextSize, readTextSize, () => DEFAULT_TEXT_SIZE);
  const [isSaving, startSave] = useTransition();
  const [isSyncing, startSync] = useTransition();
  const [, startLoad] = useTransition();
  const latestLoad = useRef(0);

  const currentKey = monthKey(view.year, view.month);
  const ready = loaded.key === currentKey && loaded.status === "ready" ? loaded : null;
  const loadError = loaded.key === currentKey && loaded.status === "error" ? loaded.error : null;

  const changes = useMemo(() => {
    if (!ready) return [];
    return Object.entries(draft).flatMap(([key, personName]) => {
      const [day, dutyKey] = key.split(":") as [string, DutyKey];
      const saved = ready.data[Number(day)]?.entries[dutyKey];
      return personName !== UNSET && personName !== saved
        ? [{ day: Number(day), dutyKey, personName }]
        : [];
    });
  }, [draft, ready]);
  const dirty = changes.length > 0;

  const reload = useCallback((year: number, month: number) => {
    const key = monthKey(year, month);
    const request = ++latestLoad.current;
    startLoad(async () => {
      setLoaded({ key, status: "loading" });
      try {
        const result = await loadPlannerMonth(year, month);
        if (latestLoad.current !== request) return;
        setLoaded(result.ok
          ? { key, status: "ready", data: result.data, rosters: result.rosters }
          : { key, status: "error", error: result.error });
      } catch {
        if (latestLoad.current !== request) return;
        setLoaded({ key, status: "error", error: "โหลดตารางเวรไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  }, []);

  const syncHolidays = useCallback((year: number, month: number, quiet: boolean) => {
    startSync(async () => {
      try {
        const result = await refreshPlannerHolidays(year);
        if (!result.ok) {
          if (!quiet) setHolidayNotice({ tone: "err", text: result.error });
          return;
        }
        if (result.added > 0) reload(year, month);
        setHolidayNotice({
          tone: "ok",
          text: result.added > 0
            ? `เพิ่มวันหยุดจาก ธปท. ${result.added} วัน`
            : "วันหยุดตรงกับ ธปท. แล้ว",
        });
      } catch {
        if (!quiet) setHolidayNotice({ tone: "err", text: "ดึงวันหยุดจาก ธปท. ไม่สำเร็จ" });
      }
    });
  }, [reload]);

  useEffect(() => {
    reload(view.year, view.month);
    return () => { latestLoad.current += 1; };
  }, [view.year, view.month, reload]);

  // Ask BOT once per year shown, so a holiday announced today is on the plan.
  const syncedYears = useRef(new Set<number>());
  useEffect(() => {
    if (syncedYears.current.has(view.year)) return;
    syncedYears.current.add(view.year);
    syncHolidays(view.year, view.month, true);
  }, [view.year, view.month, syncHolidays]);

  // Keep the column headings visible just under the app's sticky header.
  const plannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-app-header]");
    const planner = plannerRef.current;
    if (!header || !planner) return;
    const observer = new ResizeObserver(() => {
      planner.style.setProperty("--planner-sticky-top", `${header.offsetHeight}px`);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function changeMonth(delta: number) {
    if (dirty && !window.confirm("ยังไม่ได้บันทึกการแก้ไข ต้องการเปลี่ยนเดือนและทิ้งการแก้ไขหรือไม่?")) return;
    setDraft({});
    setNotice(null);
    setHolidayNotice(null);
    setView((current) => shiftMonth(current, delta));
  }

  function handleSave() {
    if (!dirty) return;
    const { year, month } = view;
    setNotice(null);
    startSave(async () => {
      try {
        const result = await savePlannerChanges({ year, month, changes });
        if (!result.ok) {
          setNotice({ tone: "err", text: result.error });
          return;
        }
        setDraft({});
        setNotice({ tone: "ok", text: `บันทึกแล้ว ${result.saved} ช่อง` });
        reload(year, month);
      } catch {
        setNotice({ tone: "err", text: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  }

  const days = daysIn(view.year, view.month);
  const valueOf = (day: number, key: DutyKey) =>
    draft[slotKey(day, key)] ?? ready?.data[day]?.entries[key] ?? UNSET;

  const counts = useMemo(() => {
    const out = { staff: new Map<string, { d1: number; opd: number }>(), intern: new Map<string, number>(), nurse: new Map<string, number>() };
    if (!ready) return out;
    for (let day = 1; day <= days; day++) {
      for (const key of DUTY_ORDER) {
        const name = draft[slotKey(day, key)] ?? ready.data[day]?.entries[key];
        if (!name || isDutyMarker(name)) continue;
        if (DUTY_ROLE[key] === "staff") {
          const row = out.staff.get(name) ?? { d1: 0, opd: 0 };
          if (key === "d1") row.d1 += 1;
          else row.opd += 1;
          out.staff.set(name, row);
        } else {
          const map = DUTY_ROLE[key] === "intern" ? out.intern : out.nurse;
          map.set(name, (map.get(name) ?? 0) + 1);
        }
      }
    }
    return out;
  }, [draft, ready, days]);

  const title = `${THAI_MONTHS[view.month]} ${view.year + BE_OFFSET}`;

  return (
    <>
      <Flex display={{ base: "flex", lg: "none" }} justify="center" py={8}>
        <GlassCard p={8} maxW="md" w="full">
          <VStack gap={4} textAlign="center">
            <Monitor size={48} />
            <Heading size="xl">กรุณาเปิดบนคอมพิวเตอร์</Heading>
            <Text fontSize="lg" lineHeight="1.7">
              หน้าวางแผนเวรออกแบบสำหรับจอคอมพิวเตอร์ กรุณาเปิดด้วย LINE บนคอมพิวเตอร์
              และขยายหน้าต่างให้กว้างขึ้น
            </Text>
          </VStack>
        </GlassCard>
      </Flex>

      <Box
        ref={plannerRef}
        display={{ base: "none", lg: "block" }}
        position="relative"
        left="50%"
        transform="translateX(-50%)"
        w="min(1440px, calc(100vw - 64px))"
        style={{ fontSize: `${textSize}px` }}
        lineHeight="1.6"
        pb="6em"
      >
        <Flex align="center" justify="space-between" gap={6} mb="1em" wrap="wrap">
          <VStack align="start" gap={0}>
            <Text fontSize="0.9em" fontWeight="semibold" color="brand.fg">วางแผนตารางเวร</Text>
            <Heading as="h1" fontSize="1.9em" lineHeight="1.3">{title}</Heading>
          </VStack>
          <HStack gap={3} wrap="wrap">
            <Button size="xl" fontSize="0.95em" variant="outline" onClick={() => changeMonth(-1)}>
              <ChevronLeft size={24} /> เดือนก่อน
            </Button>
            <Button size="xl" fontSize="0.95em" variant="outline" onClick={() => changeMonth(1)}>
              เดือนถัดไป <ChevronRight size={24} />
            </Button>
          </HStack>
        </Flex>

        <Flex align="center" justify="space-between" gap={6} mb="1em" wrap="wrap">
          <HStack gap={3}>
            <Text fontSize="0.95em" fontWeight="semibold">ขนาดตัวอักษร</Text>
            <HStack gap={1} role="group" aria-label="ขนาดตัวอักษร">
              {TEXT_SIZES.map((size) => (
                <Button
                  key={size.px}
                  size="lg"
                  variant={textSize === size.px ? "solid" : "outline"}
                  colorPalette="brand"
                  aria-pressed={textSize === size.px}
                  onClick={() => writeTextSize(size.px)}
                  style={{ fontSize: `${size.px}px` }}
                >
                  {size.label}
                </Button>
              ))}
            </HStack>
          </HStack>
          <HStack gap={3}>
            {holidayNotice && (
              <Text fontSize="0.9em" fontWeight="medium" color={holidayNotice.tone === "ok" ? "brand.fg" : "holiday.fg"}>
                {holidayNotice.text}
              </Text>
            )}
            <Button
              size="lg"
              fontSize="0.9em"
              variant="subtle"
              colorPalette="brand"
              onClick={() => syncHolidays(view.year, view.month, false)}
              loading={isSyncing}
              loadingText="กำลังดึงวันหยุด…"
            >
              <CalendarSync size={22} /> อัปเดตวันหยุดจาก ธปท.
            </Button>
          </HStack>
        </Flex>

        <Legend />

        {!ready && (
          <VStack gap={3} py="2em" role={loadError ? "alert" : "status"}>
            <Text fontSize="1.1em" color={loadError ? "holiday.fg" : "fg"}>
              {loadError ?? "กำลังโหลดตารางเวร…"}
            </Text>
            {loadError && (
              <Button size="lg" variant="outline" onClick={() => reload(view.year, view.month)}>ลองอีกครั้ง</Button>
            )}
          </VStack>
        )}

        {ready && (
          <GlassCard variant="solid" overflow="clip">
            <Box as="table" w="full" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
              <Box as="colgroup">
                <col style={{ width: "12%" }} />
                {DUTY_ORDER.map((key) => <col key={key} style={{ width: COLUMN_WIDTHS[key] }} />)}
              </Box>
              <Box as="thead">
                <Box as="tr">
                  <HeaderCell>วันที่</HeaderCell>
                  {DUTY_ORDER.map((key) => {
                    const Icon = DUTY_ICONS[key];
                    return (
                      <HeaderCell key={key}>
                        <HStack gap={2} color={DUTY_ICON_COLORS[key]}>
                          <Icon size={24} />
                          <Text as="span" color="fg">{DUTY_LABELS[key]}</Text>
                        </HStack>
                      </HeaderCell>
                    );
                  })}
                </Box>
              </Box>
              <Box as="tbody">
                {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
                  const weekday = new Date(view.year, view.month, day).getDay();
                  const info = ready.data[day];
                  const holiday = !!info?.holiday;
                  const weekend = weekday === 0 || weekday === 6;
                  const rowBg = holiday ? "holiday.subtle" : weekend ? "weekend.subtle" : "transparent";
                  return (
                    <Box as="tr" key={day} bg={rowBg} borderTopWidth="2px" borderColor="border">
                      <Box as="td" px="0.75em" py="0.5em" verticalAlign="middle">
                        <HStack gap="0.5em" align="baseline">
                          <Text
                            as="span"
                            fontSize="1.5em"
                            fontWeight="bold"
                            fontFamily="var(--font-plex-sans)"
                            color={holiday ? "holiday.fg" : weekend ? "weekend.fg" : "fg"}
                          >
                            {day}
                          </Text>
                          <Text as="span" fontWeight="semibold" color={holiday ? "holiday.fg" : weekend ? "weekend.fg" : "fg"}>
                            {THAI_WD_FULL[weekday]}
                          </Text>
                        </HStack>
                        {holiday && (
                          <Text fontSize="0.8em" fontWeight="semibold" color="holiday.fg" lineHeight="1.4" lineClamp={2} title={info?.holidayLabel ?? undefined}>
                            {info?.holidayLabel ?? "วันหยุด"}
                          </Text>
                        )}
                      </Box>
                      {DUTY_ORDER.map((key) => {
                        if (!dutyApplies(key, weekday)) {
                          return (
                            <Box as="td" key={key} px="0.5em" textAlign="center" color="fg.muted" fontSize="0.85em">
                              ไม่มีเวร
                            </Box>
                          );
                        }
                        const roster = ready.rosters[DUTY_ROLE[key]];
                        const saved = info?.entries[key];
                        const value = valueOf(day, key);
                        const changed = value !== UNSET && value !== saved;
                        return (
                          <Box as="td" key={key} px="0.4em" py="0.4em">
                            <NativeSelect.Root>
                              <NativeSelect.Field
                                aria-label={`${DUTY_LABELS[key]} วันที่ ${day}`}
                                value={value}
                                onChange={(event) => {
                                  const next = event.target.value;
                                  setNotice(null);
                                  setDraft((current) => {
                                    const copy = { ...current };
                                    if (next === (saved ?? UNSET)) delete copy[slotKey(day, key)];
                                    else copy[slotKey(day, key)] = next;
                                    return copy;
                                  });
                                }}
                                h="2.6em"
                                fontSize="1em"
                                fontWeight={value && !isDutyMarker(value) ? "semibold" : "normal"}
                                color={value === UNSET || isDutyMarker(value) ? "fg.muted" : "fg"}
                                bg={changed ? "brand.subtle" : "bg.panel"}
                                borderWidth="2px"
                                borderColor={changed ? "brand.solid" : "border.emphasized"}
                                title={value ? optionLabel(roster, value) : undefined}
                              >
                                {(value === UNSET) && <option value={UNSET}>— เลือก —</option>}
                                {slotOptions(roster, saved).map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                                <option value="งด">งด</option>
                                <option value="-">ว่าง (-)</option>
                              </NativeSelect.Field>
                              <NativeSelect.Indicator />
                            </NativeSelect.Root>
                          </Box>
                        );
                      })}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </GlassCard>
        )}

        {ready && <Counts counts={counts} rosters={ready.rosters} />}

        <Box
          position="fixed"
          left={0}
          right={0}
          bottom={0}
          zIndex={20}
          bg="glass.solid"
          borderTopWidth="2px"
          borderColor={dirty ? "brand.solid" : "glass.border"}
          backdropFilter="blur(12px)"
          boxShadow="0 -6px 24px rgba(15, 23, 32, 0.12)"
        >
          <Flex mx="auto" w="min(1440px, calc(100vw - 64px))" align="center" gap={4} py={3}>
            <Text fontSize="1.05em" fontWeight="semibold" color={notice?.tone === "err" ? "holiday.fg" : dirty ? "brand.fg" : "fg"} role="status">
              {notice?.text ?? (dirty ? `มีการแก้ไข ${changes.length} ช่อง ยังไม่ได้บันทึก` : "ไม่มีการแก้ไข")}
            </Text>
            <HStack ml="auto" gap={3}>
              <Button size="xl" fontSize="0.95em" variant="outline" disabled={!dirty || isSaving} onClick={() => { setDraft({}); setNotice(null); }}>
                <RotateCcw size={22} /> ยกเลิกการแก้ไข
              </Button>
              <Button size="xl" fontSize="1em" colorPalette="brand" disabled={!dirty} loading={isSaving} loadingText="กำลังบันทึก…" onClick={handleSave}>
                <Save size={22} /> บันทึก
              </Button>
            </HStack>
          </Flex>
        </Box>
      </Box>
    </>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      as="th"
      position="sticky"
      top="var(--planner-sticky-top, 0px)"
      zIndex={1}
      bg="brand.subtle"
      textAlign="left"
      px="0.75em"
      py="0.6em"
      fontSize="1em"
      fontWeight="bold"
    >
      {children}
    </Box>
  );
}

function Legend() {
  const swatches = [
    { bg: "weekend.subtle", fg: "weekend.fg", label: "เสาร์-อาทิตย์" },
    { bg: "holiday.subtle", fg: "holiday.fg", label: "วันหยุดราชการ (ธปท.)" },
    { bg: "brand.subtle", fg: "brand.fg", label: "ช่องที่แก้ไข ยังไม่บันทึก" },
  ];
  return (
    <HStack gap={6} mb="1em" wrap="wrap">
      {swatches.map((swatch) => (
        <HStack key={swatch.label} gap={2}>
          <Box w="1.4em" h="1.4em" borderRadius="md" bg={swatch.bg} borderWidth="2px" borderColor={swatch.fg} />
          <Text fontSize="0.9em" fontWeight="medium">{swatch.label}</Text>
        </HStack>
      ))}
    </HStack>
  );
}

function Counts({
  counts,
  rosters,
}: {
  counts: { staff: Map<string, { d1: number; opd: number }>; intern: Map<string, number>; nurse: Map<string, number> };
  rosters: PlannerRosters;
}) {
  const staffRows = rosters.staff.map((option) => ({ ...option, ...(counts.staff.get(option.value) ?? { d1: 0, opd: 0 }) }));
  const columns = [
    {
      title: "Staff",
      rows: staffRows.map((row) => ({ key: row.value, label: row.label, value: `เวร ${row.d1} · OPD ${row.opd}` })),
    },
    {
      title: "Intern",
      rows: rosters.intern
        .filter((option) => counts.intern.has(option.value))
        .map((option) => ({ key: option.value, label: option.label, value: `${counts.intern.get(option.value)} วัน` })),
    },
    {
      title: "พยาบาลห้องเฝือก",
      rows: rosters.nurse.map((option) => ({ key: option.value, label: option.label, value: `${counts.nurse.get(option.value) ?? 0} วัน` })),
    },
  ];
  return (
    <Box mt="1.5em">
      <Heading as="h2" fontSize="1.3em" mb="0.6em">สรุปจำนวนเวรเดือนนี้</Heading>
      <Grid templateColumns="repeat(3, 1fr)" gap={4}>
        {columns.map((column) => (
          <GlassCard key={column.title} variant="solid" p="1em">
            <Text fontSize="1.05em" fontWeight="bold" mb="0.4em">{column.title}</Text>
            {column.rows.length === 0 && <Text color="fg.muted">ยังไม่มีเวร</Text>}
            {column.rows.map((row) => (
              <Flex key={row.key} justify="space-between" gap={3} py="0.25em" borderTopWidth="1px" borderColor="border" _first={{ borderTopWidth: 0 }}>
                <Text truncate title={row.label}>{row.label}</Text>
                <Text flexShrink={0} fontWeight="semibold" fontFamily="var(--font-plex-sans)">{row.value}</Text>
              </Flex>
            ))}
          </GlassCard>
        ))}
      </Grid>
    </Box>
  );
}
