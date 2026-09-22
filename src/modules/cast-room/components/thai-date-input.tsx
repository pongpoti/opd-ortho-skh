"use client";

import { useRef, useState } from "react";
import { Box, Button, Dialog, Grid, HStack, IconButton, Portal, Text, VStack } from "@chakra-ui/react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { buildMonthCells, formatThaiDate, parseISO, thaiMonthYear, toISO, THAI_WD_SHORT } from "../lib/thai-date";

export interface ThaiDateInputProps {
  value: string;
  onChange: (value: string) => void;
}

const SWIPE_THRESHOLD = 55;

/** Full-width date field styled and labeled entirely in Thai -- the native
 * <input type="date"> picker can't be reskinned to show Thai month/weekday
 * names (that chrome is OS-drawn, not stylable), so this replaces it with a
 * button that opens a small custom month-grid picker instead. */
export function ThaiDateInput({ value, onChange }: ThaiDateInputProps) {
  const selected = parseISO(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: selected.year, month: selected.month });
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const wheelLock = useRef(false);

  function openPicker() {
    setView({ year: selected.year, month: selected.month });
    setOpen(true);
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
  // Hide the next-month peek on the right: drop trailing outside days so only
  // the current month (plus leading blanks for weekday alignment) is shown.
  let lastInMonth = cells.length;
  while (lastInMonth > 0 && cells[lastInMonth - 1].outside) lastInMonth -= 1;
  const visibleCells = cells.slice(0, lastInMonth);

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
        {formatThaiDate(value)}
      </Button>

      <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop backdropFilter="blur(4px)" />
          <Dialog.Positioner>
            <Dialog.Content bg="glass.solid" backdropFilter="blur(16px)" borderWidth="1px" borderColor="glass.border" maxW="320px" w="full">
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

                <Grid templateColumns="repeat(7, 1fr)" gap={1} mb={1}>
                  {THAI_WD_SHORT.map((w) => (
                    <Text key={w} textAlign="center" fontSize="xs" color="fg.muted" fontWeight="medium">
                      {w}
                    </Text>
                  ))}
                </Grid>

                <Grid templateColumns="repeat(7, 1fr)" gap={1}>
                  {visibleCells.map((c) => {
                    if (c.outside) {
                      return <Box key={`${c.year}-${c.month}-${c.day}-outside`} aria-hidden />;
                    }

                    const iso = toISO(c.year, c.month, c.day);
                    const isSelected = iso === value;
                    return (
                      <Box key={`${c.year}-${c.month}-${c.day}`}>
                        <Button
                          type="button"
                          size="sm"
                          w="full"
                          variant={isSelected ? "solid" : "ghost"}
                          colorPalette="brand"
                          onClick={() => {
                            onChange(iso);
                            setOpen(false);
                          }}
                        >
                          {c.day}
                        </Button>
                      </Box>
                    );
                  })}
                </Grid>

                <VStack gap={0} mt={3}>
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
