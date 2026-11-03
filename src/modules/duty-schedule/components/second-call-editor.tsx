"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Box, Button, Flex, Grid, Heading, HStack, IconButton, NativeSelect, Text, VStack } from "@chakra-ui/react";
import { Pin, RotateCcw, Save, Undo2 } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import type { SecondCallConflict, SubDuty } from "../lib/second-call-assign";
import {
  loadSecondCallEditor,
  saveSecondCallEdits,
  type SecondCallEditorMonth,
  type SecondCallEditorSlot,
} from "../lib/second-call-actions";

const THAI_WD_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

/** Columns in time order of one duty day: ช and บ that day, ด the next morning. */
const COLUMNS: { shift: SubDuty; title: string; note: string }[] = [
  { shift: "ช", title: "ช (เช้า)", note: "เสาร์ อาทิตย์ วันหยุด" },
  { shift: "บ", title: "บ (บ่าย)", note: "วันนั้น" },
  { shift: "ด", title: "ด (ดึก)", note: "เช้ามืดวันถัดไป" },
];

const CONFLICT_LABELS: Record<SecondCallConflict, string> = {
  real: "อยู่เวรจริงช่วงนี้",
  weekday: "ไม่รับวันนี้",
  friday: "อยู่เวรจริงวันศุกร์",
};

/** Short form for the dropdown, so the chosen name still fits the cell. */
const CONFLICT_SHORT: Record<SecondCallConflict, string> = {
  real: "อยู่เวร",
  weekday: "งดวันนี้",
  friday: "เวรศุกร์",
};

/** Draft value that hands a sub-duty back to the automatic assignment. */
const AUTO = "__auto__";

const ROW_HEIGHT = "4.4em";

type Loaded =
  | { key: string; status: "loading" }
  | { key: string; status: "ready"; month: SecondCallEditorMonth }
  | { key: string; status: "error"; error: string };

type Notice = { tone: "ok" | "err"; text: string } | null;

const editKey = (dutyDay: number, shift: SubDuty) => `${dutyDay}:${shift}`;
const firstName = (name: string) => name.trim().split(/\s+/u)[0];

/**
 * Admin editor for a month's second-call: one row per duty day, one dropdown
 * per sub-duty. A name chosen here is kept by the nightly job; "กลับเป็น
 * อัตโนมัติ" hands the sub-duty back to the turn order.
 */
export function SecondCallEditor({
  year,
  month,
  onDirtyChange,
}: {
  year: number;
  month: number;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const key = `${year}-${month}`;
  const [loaded, setLoaded] = useState<Loaded>({ key: "", status: "loading" });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [isSaving, startSave] = useTransition();
  const [, startLoad] = useTransition();
  const latestLoad = useRef(0);

  const ready = loaded.key === key && loaded.status === "ready" ? loaded.month : null;
  const loadError = loaded.key === key && loaded.status === "error" ? loaded.error : null;

  const reload = useCallback((y: number, m: number) => {
    const k = `${y}-${m}`;
    const request = ++latestLoad.current;
    startLoad(async () => {
      setLoaded({ key: k, status: "loading" });
      try {
        const result = await loadSecondCallEditor(y, m);
        if (latestLoad.current !== request) return;
        setLoaded(result.ok ? { key: k, status: "ready", month: result.month } : { key: k, status: "error", error: result.error });
      } catch {
        if (latestLoad.current !== request) return;
        setLoaded({ key: k, status: "error", error: "โหลด second-call ไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  }, []);

  // The planner remounts the editor per month (key), so the draft starts empty.
  useEffect(() => {
    reload(year, month);
    return () => { latestLoad.current += 1; };
  }, [year, month, reload]);

  const slots = useMemo(() => {
    const map = new Map<string, SecondCallEditorSlot & { dutyDay: number }>();
    for (const day of ready?.days ?? []) {
      for (const slot of day.slots) map.set(editKey(day.day, slot.shift), { ...slot, dutyDay: day.day });
    }
    return map;
  }, [ready]);

  const edits = useMemo(() => Object.entries(draft).map(([k, value]) => {
    const slot = slots.get(k)!;
    return { dutyDay: slot.dutyDay, shift: slot.shift, name: value === AUTO ? null : value };
  }), [draft, slots]);
  const dirty = edits.length > 0;

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  /** Name shown for a sub-duty: the draft, else the saved or planned name. */
  const shownName = (slot: SecondCallEditorSlot, k: string) => {
    const value = draft[k];
    if (value === undefined) return slot.name;
    return value === AUTO ? null : value;
  };

  function setSlot(k: string, value: string) {
    const slot = slots.get(k);
    if (!slot) return;
    setNotice(null);
    // Back to how it is saved: no edit. Anything else pins (or unpins) it.
    const unchanged = value === AUTO ? slot.source !== "admin" : slot.source === "admin" && value === slot.name;
    setDraft((current) => {
      const copy = { ...current };
      if (unchanged) delete copy[k];
      else copy[k] = value;
      return copy;
    });
  }

  function handleSave() {
    if (!dirty) return;
    setNotice(null);
    startSave(async () => {
      try {
        const result = await saveSecondCallEdits({ year, month, edits });
        if (!result.ok) {
          setNotice({ tone: "err", text: result.error });
          return;
        }
        setDraft({});
        setNotice({ tone: "ok", text: `บันทึกแล้ว ${result.saved} ช่อง จัดช่องอัตโนมัติใหม่ตามลำดับแล้ว` });
        reload(year, month);
      } catch {
        setNotice({ tone: "err", text: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  }

  const counts = useMemo(() => {
    const out = new Map<string, number>((ready?.staff ?? []).map((name) => [name, 0]));
    for (const [k, slot] of slots) {
      const name = shownName(slot, k);
      if (name) out.set(name, (out.get(name) ?? 0) + 1);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, draft, ready]);

  if (!ready) {
    if (!loadError) return <TableSkeleton columns={COLUMNS.length + 1} />;
    return (
      <VStack gap={3} py="2em" role="alert">
        <Text fontSize="1.1em" color="fg.error">{loadError}</Text>
        <Button size="lg" variant="outline" onClick={() => reload(year, month)}>ลองอีกครั้ง</Button>
      </VStack>
    );
  }

  if (!ready.hasRoster) {
    return (
      <GlassCard variant="solid" p="1.5em">
        <Text fontSize="1.1em" textAlign="center">เดือนนี้ยังไม่มีเวร staff ใส่เวรจริงในแท็บ “เวรหลัก” ก่อน แล้วจึงจัด second-call</Text>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard variant="solid" p="1em" mb="1em">
        <Text lineHeight="1.7">
          ชื่อที่เลือกเองจะมีหมุด <Box as="span" display="inline-flex" verticalAlign="middle" color="brand.fg"><Pin size={18} /></Box> และระบบจะไม่เปลี่ยนให้
          ช่องอื่นระบบจัดให้ตามลำดับ และจะจัดใหม่หลังบันทึก
        </Text>
      </GlassCard>

      <GlassCard variant="solid" overflow="clip">
        <Box as="table" w="full" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
          <Box as="colgroup">
            <col style={{ width: "12%" }} />
            <col style={{ width: "16%" }} />
            {COLUMNS.map((column) => <col key={column.shift} />)}
          </Box>
          <Box as="thead">
            <Box as="tr">
              <HeaderCell>วันที่</HeaderCell>
              <HeaderCell>เวรจริง</HeaderCell>
              {COLUMNS.map((column) => (
                <HeaderCell key={column.shift}>
                  <Text as="span">{column.title}</Text>
                  <Text fontSize="0.75em" fontWeight="semibold" color="fg.muted" lineHeight="1.3">{column.note}</Text>
                </HeaderCell>
              ))}
            </Box>
          </Box>
          <Box as="tbody">
            {ready.days.map((info) => {
              const weekday = new Date(year, month, info.day).getDay();
              const weekend = weekday === 0 || weekday === 6;
              const rowBg = info.holiday ? "holiday.subtle" : weekend ? "weekend.subtle" : "transparent";
              const dayColor = info.holiday ? "holiday.fg" : weekend ? "weekend.fg" : "fg";
              return (
                <Box as="tr" key={info.day} bg={rowBg} borderTopWidth="2px" borderColor="border" h={ROW_HEIGHT}>
                  <Box as="td" px="0.75em" py="0.5em" verticalAlign="middle">
                    <HStack gap="0.5em" align="baseline">
                      <Text as="span" fontSize="1.5em" lineHeight="1.2" fontWeight="bold" fontFamily="var(--font-plex-sans)" color={dayColor}>
                        {info.day}
                      </Text>
                      <Text as="span" fontWeight="semibold" color={dayColor}>{THAI_WD_FULL[weekday]}</Text>
                    </HStack>
                    {info.holiday && (
                      <Text fontSize="0.8em" fontWeight="semibold" color="holiday.fg" lineHeight="1.3" truncate title={info.holidayLabel ?? undefined}>
                        {info.holidayLabel ?? "วันหยุด"}
                      </Text>
                    )}
                  </Box>
                  <Box as="td" px="0.75em" py="0.5em">
                    <Text fontWeight="semibold" color={info.real && info.real !== "-" && info.real !== "งด" ? "fg" : "fg.muted"} truncate title={info.real ?? undefined}>
                      {info.real && info.real !== "-" ? info.real : "ยังไม่มีเวร"}
                    </Text>
                  </Box>
                  {COLUMNS.map((column) => {
                    const k = editKey(info.day, column.shift);
                    const slot = slots.get(k);
                    if (!slot) {
                      return (
                        <Box as="td" key={column.shift} px="0.75em" color="fg.subtle" aria-hidden>—</Box>
                      );
                    }
                    return (
                      <Box as="td" key={column.shift} px="0.4em" py="0.4em">
                        <SlotSelect
                          label={`${column.title} วันที่ ${info.day}`}
                          slot={slot}
                          value={shownName(slot, k)}
                          draft={draft[k]}
                          staff={ready.staff}
                          onChange={(value) => setSlot(k, value)}
                        />
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        </Box>
      </GlassCard>

      <Box mt="1.5em">
        <Heading as="h2" fontSize="1.3em" mb="0.6em">จำนวน second-call เดือนนี้</Heading>
        <GlassCard variant="solid" p="1em">
          <Grid templateColumns="repeat(3, 1fr)" columnGap={8}>
            {[...counts].map(([name, count]) => (
              <Flex key={name} justify="space-between" gap={3} py="0.3em" borderBottomWidth="1px" borderColor="border">
                <Text truncate title={name}>{name}</Text>
                <Text flexShrink={0} fontWeight="semibold" fontFamily="var(--font-plex-sans)">{count} ครั้ง</Text>
              </Flex>
            ))}
          </Grid>
        </GlassCard>
      </Box>

      <Box
        position="sticky"
        bottom="1em"
        zIndex={20}
        mt="1.5em"
        bg="glass.solid"
        borderWidth="2px"
        borderRadius="l3"
        borderColor={dirty ? "brand.solid" : "glass.border"}
        backdropFilter="blur(12px)"
        boxShadow="0 -6px 24px rgba(15, 23, 32, 0.12)"
      >
        <Flex align="center" gap={4} px="1.25em" py="0.75em">
          <Text fontSize="1.05em" fontWeight="semibold" color={notice?.tone === "err" ? "fg.error" : dirty ? "brand.fg" : "fg"} role="status">
            {notice?.text ?? (dirty ? `มีการแก้ไข ${edits.length} ช่อง ยังไม่ได้บันทึก` : "ไม่มีการแก้ไข")}
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
    </>
  );
}

function SlotSelect({
  label,
  slot,
  value,
  draft,
  staff,
  onChange,
}: {
  label: string;
  slot: SecondCallEditorSlot;
  value: string | null;
  draft: string | undefined;
  staff: string[];
  onChange: (value: string) => void;
}) {
  const changed = draft !== undefined;
  // Pinned when an admin set it and the draft doesn't undo that, or the draft names someone.
  const pinned = changed ? draft !== AUTO : slot.source === "admin";
  const conflict = value ? slot.conflicts[value] : undefined;
  const selectValue = value ?? AUTO;
  return (
    <HStack gap="0.2em">
      <NativeSelect.Root flex="1" minW={0}>
        <NativeSelect.Field
          aria-label={label}
          value={selectValue}
          onChange={(event) => onChange(event.target.value)}
          h="2.6em"
          fontSize="1em"
          fontWeight={value ? "semibold" : "normal"}
          color={value ? "fg" : "fg.muted"}
          bg={changed ? "brand.subtle" : "bg.panel"}
          borderWidth="2px"
          borderColor={conflict ? "border.error" : changed ? "brand.solid" : "border.emphasized"}
          title={conflict ? `${value}: ${CONFLICT_LABELS[conflict]}` : value ?? undefined}
          ps={pinned ? "2em" : undefined}
        >
          <option value={AUTO}>{changed && draft === AUTO ? "อัตโนมัติ (จัดหลังบันทึก)" : "อัตโนมัติ"}</option>
          {value && !staff.includes(value) && <option value={value}>{value}</option>}
          {staff.map((name) => {
            const reason = slot.conflicts[name];
            return (
              <option key={name} value={name}>
                {firstName(name)}{reason ? ` ⚠ ${CONFLICT_SHORT[reason]}` : ""}
              </option>
            );
          })}
        </NativeSelect.Field>
        {pinned && (
          <Box position="absolute" left="0.6em" top="50%" transform="translateY(-50%)" color="brand.fg" pointerEvents="none" aria-label="เลือกเอง">
            <Pin size={18} />
          </Box>
        )}
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      {pinned && (
        <IconButton
          aria-label={`${label}: กลับเป็นอัตโนมัติ`}
          title="กลับเป็นอัตโนมัติ"
          size="sm"
          variant="ghost"
          onClick={() => onChange(AUTO)}
        >
          <Undo2 size={18} />
        </IconButton>
      )}
    </HStack>
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
      verticalAlign="top"
    >
      {children}
    </Box>
  );
}
