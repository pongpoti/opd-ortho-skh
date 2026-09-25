"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  Field,
  Grid,
  HStack,
  IconButton,
  NativeSelect,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { buildMonthCells, formatThaiDate, parseISO, thaiMonthYear, toISO, THAI_WD_SHORT } from "../lib/thai-date";

export interface ThaiDateInputProps {
  value: string;
  onChange: (value: string) => void;
  /** `HH:mm` (24-hour), or empty when not yet chosen. */
  time?: string;
  onTimeChange?: (time: string) => void;
  useCurrentTime?: boolean;
  onUseCurrentTimeChange?: (use: boolean) => void;
}

const SWIPE_THRESHOLD = 55;
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function splitHHMM(time: string): { hour: string; minute: string } {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return { hour: "", minute: "" };
  return { hour: match[1], minute: match[2] };
}

/** Full-width date field styled and labeled entirely in Thai -- the native
 * <input type="date"> picker can't be reskinned to show Thai month/weekday
 * names (that chrome is OS-drawn, not stylable), so this replaces it with a
 * button that opens a small custom month-grid picker instead. */
export function ThaiDateInput({
  value,
  onChange,
  time: timeProp,
  onTimeChange,
  useCurrentTime: useCurrentTimeProp,
  onUseCurrentTimeChange,
}: ThaiDateInputProps) {
  const selected = parseISO(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: selected.year, month: selected.month });
  const [draftDate, setDraftDate] = useState(value);
  const [internalTime, setInternalTime] = useState(timeProp ?? "");
  const [internalUseCurrentTime, setInternalUseCurrentTime] = useState(useCurrentTimeProp ?? false);
  const [draftHour, setDraftHour] = useState("");
  const [draftMinute, setDraftMinute] = useState("");
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const wheelLock = useRef(false);

  const time = timeProp ?? internalTime;
  const useCurrentTime = useCurrentTimeProp ?? internalUseCurrentTime;
  const timeComplete = Boolean(draftHour) && Boolean(draftMinute);
  const canConfirm = useCurrentTime || timeComplete;

  function setTime(next: string) {
    if (timeProp === undefined) setInternalTime(next);
    onTimeChange?.(next);
  }

  function applyCurrentTime() {
    const now = nowHHMM();
    const parts = splitHHMM(now);
    setDraftHour(parts.hour);
    setDraftMinute(parts.minute);
    setTime(now);
  }

  function clearTimeDraft() {
    setDraftHour("");
    setDraftMinute("");
    setTime("");
  }

  function setUseCurrentTime(next: boolean) {
    if (useCurrentTimeProp === undefined) setInternalUseCurrentTime(next);
    onUseCurrentTimeChange?.(next);
    if (next) applyCurrentTime();
    else clearTimeDraft();
  }

  function setHour(nextHour: string) {
    setDraftHour(nextHour);
    if (nextHour && draftMinute) setTime(`${nextHour}:${draftMinute}`);
    else setTime("");
  }

  function setMinute(nextMinute: string) {
    setDraftMinute(nextMinute);
    if (draftHour && nextMinute) setTime(`${draftHour}:${nextMinute}`);
    else setTime("");
  }

  useEffect(() => {
    if (!open || !useCurrentTime) return;
    applyCurrentTime();
    const id = window.setInterval(() => {
      applyCurrentTime();
    }, 15_000);
    return () => window.clearInterval(id);
    // Refresh wall-clock while "use current time" is on and the picker is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally tied to open/useCurrentTime only
  }, [open, useCurrentTime]);

  function openPicker() {
    setView({ year: selected.year, month: selected.month });
    setDraftDate(value);
    if (useCurrentTime) {
      applyCurrentTime();
    } else {
      const parts = splitHHMM(time);
      setDraftHour(parts.hour);
      setDraftMinute(parts.minute);
    }
    setOpen(true);
  }

  function confirmSelection() {
    if (!canConfirm) return;
    if (useCurrentTime) applyCurrentTime();
    onChange(draftDate);
    setOpen(false);
  }

  function changeMonth(delta: number) {
    setView((v) => {
      let month = v.month + delta;
      let year = v.year;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
      if (month > 11) {
        month = 0;
        year += 1;
      }
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

  function handleWheel(e: React.WheelEvent) {
    if (Math.abs(e.deltaY) < 24 || wheelLock.current) return;
    wheelLock.current = true;
    changeMonth(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => {
      wheelLock.current = false;
    }, 500);
  }

  const cells = buildMonthCells(view.year, view.month);
  const buttonLabel = time
    ? `${formatThaiDate(value)} · ${time}${useCurrentTime ? " (ปัจจุบัน)" : ""}`
    : formatThaiDate(value);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        w="full"
        justifyContent="flex-start"
        fontWeight="normal"
        fontSize="16px"
        onClick={openPicker}
      >
        <CalendarDays size={18} />
        {buttonLabel}
      </Button>

      <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop backdropFilter="blur(4px)" />
          <Dialog.Positioner>
            <Dialog.Content
              bg="glass.solid"
              backdropFilter="blur(16px)"
              borderWidth="1px"
              borderColor="glass.border"
              maxW="320px"
              w="full"
              overflow="hidden"
            >
              <Dialog.Body
                p={4}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                style={{ touchAction: "pan-y", overscrollBehaviorX: "contain" }}
              >
                <HStack justify="space-between" mb={3}>
                  <IconButton aria-label="เดือนก่อนหน้า" variant="ghost" size="sm" onClick={() => changeMonth(-1)}>
                    <ChevronLeft size={18} />
                  </IconButton>
                  <Text fontWeight="semibold">{thaiMonthYear(view.year, view.month)}</Text>
                  <IconButton aria-label="เดือนถัดไป" variant="ghost" size="sm" onClick={() => changeMonth(1)}>
                    <ChevronRight size={18} />
                  </IconButton>
                </HStack>

                <Grid templateColumns="repeat(7, minmax(0, 1fr))" gap={1} mb={1}>
                  {THAI_WD_SHORT.map((w) => (
                    <Text key={w} textAlign="center" fontSize="xs" color="fg.muted" fontWeight="medium">
                      {w}
                    </Text>
                  ))}
                </Grid>

                <Grid templateColumns="repeat(7, minmax(0, 1fr))" gap={1}>
                  {cells.map((c) => {
                    if (c.kind === "blank") {
                      return <Box key={c.key} minH="8" minW={0} aria-hidden />;
                    }

                    const iso = toISO(c.year, c.month, c.day);
                    const isSelected = iso === draftDate;
                    return (
                      <Box key={iso} minW={0}>
                        <Button
                          type="button"
                          size="sm"
                          w="full"
                          minW={0}
                          px={0}
                          variant={isSelected ? "solid" : "ghost"}
                          colorPalette="brand"
                          onClick={() => setDraftDate(iso)}
                        >
                          {c.day}
                        </Button>
                      </Box>
                    );
                  })}
                </Grid>

                <VStack align="stretch" gap={3} mt={4} pt={3} borderTopWidth="1px" borderColor="glass.border">
                  <Field.Root>
                    <Field.Label fontSize="sm" textAlign="center" w="full">
                      เวลา (24 ชม.)
                    </Field.Label>
                    <HStack gap={2} justify="center" maxW="200px" mx="auto" w="full">
                      <NativeSelect.Root flex="1" disabled={useCurrentTime}>
                        <NativeSelect.Field
                          fontSize="16px"
                          textAlign="center"
                          value={draftHour}
                          aria-label="ชั่วโมง"
                          onChange={(e) => setHour(e.target.value)}
                        >
                          <option value="">-</option>
                          {HOURS.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                      <Text fontWeight="semibold" color="fg.muted">
                        :
                      </Text>
                      <NativeSelect.Root flex="1" disabled={useCurrentTime}>
                        <NativeSelect.Field
                          fontSize="16px"
                          textAlign="center"
                          value={draftMinute}
                          aria-label="นาที"
                          onChange={(e) => setMinute(e.target.value)}
                        >
                          <option value="">-</option>
                          {MINUTES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </HStack>
                  </Field.Root>

                  <Checkbox.Root
                    checked={useCurrentTime}
                    onCheckedChange={(e) => setUseCurrentTime(!!e.checked)}
                    colorPalette="brand"
                    justifyContent="center"
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Label fontSize="sm">ใช้เวลาปัจจุบัน</Checkbox.Label>
                  </Checkbox.Root>
                </VStack>

                <VStack gap={2} mt={6}>
                  <Button
                    type="button"
                    colorPalette="brand"
                    w="full"
                    disabled={!canConfirm}
                    onClick={confirmSelection}
                  >
                    ตกลง
                  </Button>
                  <Text fontSize="xs" color="fg.muted" textAlign="center">
                    ปัดซ้าย-ขวาเพื่อเปลี่ยนเดือน
                  </Text>
                </VStack>
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
