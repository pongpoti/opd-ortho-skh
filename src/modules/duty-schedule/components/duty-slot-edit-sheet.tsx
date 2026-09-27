"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Box,
  Button,
  Drawer,
  HStack,
  IconButton,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { X } from "lucide-react";

import {
  DUTY_LABELS,
  formatDutyDisplayName,
  type DutyKey,
} from "../lib/duty-data";
import {
  getDutyEditRoster,
  saveDutySlot,
  type DutyRosterOption,
} from "../lib/duty-actions";

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const THAI_WD_FULL = [
  "วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์",
];
const BE_OFFSET = 543;

type DutySlotEditSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  day: number;
  dutyKey: DutyKey;
  currentName: string | undefined;
  onSaved: () => void;
};

export function DutySlotEditSheet({
  open,
  onOpenChange,
  year,
  month,
  day,
  dutyKey,
  currentName,
  onSaved,
}: DutySlotEditSheetProps) {
  const [options, setOptions] = useState<DutyRosterOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoading, startLoad] = useTransition();
  const [isSaving, startSave] = useTransition();

  const weekday = new Date(year, month, day).getDay();

  useEffect(() => {
    if (!open) return;
    setSelected(currentName && currentName !== "-" ? currentName : null);
    setSaveError(null);
    setLoadError(null);
    startLoad(async () => {
      const result = await getDutyEditRoster({ year, month, day, dutyKey });
      if (!result.ok) {
        setLoadError(result.error);
        setOptions([]);
        return;
      }
      setOptions(result.options);
    });
  }, [open, year, month, day, dutyKey, currentName]);

  const canSave = !!selected && !isSaving && !isLoading;

  function handleSave() {
    if (!selected) return;
    setSaveError(null);
    startSave(async () => {
      const result = await saveDutySlot({
        year,
        month,
        day,
        dutyKey,
        personName: selected,
      });
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      onSaved();
      onOpenChange(false);
    });
  }

  return (
    <Drawer.Root
      placement="bottom"
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
    >
      <Portal>
        <Drawer.Backdrop backdropFilter="blur(4px)" />
        <Drawer.Positioner>
          <Drawer.Content
            bg="glass.solid"
            backdropFilter="blur(16px)"
            borderTopWidth="1px"
            borderColor="glass.border"
            borderRadius="20px 20px 0 0"
            maxH="85vh"
          >
            <Drawer.Header
              display="flex"
              alignItems="flex-start"
              justifyContent="space-between"
              gap={3}
            >
              <VStack align="start" gap={0}>
                <Drawer.Title fontSize="xl">แก้ไข{DUTY_LABELS[dutyKey]}</Drawer.Title>
                <Text fontSize="sm" color="fg.muted">
                  {day} {THAI_MONTHS_SHORT[month]} {year + BE_OFFSET} · {THAI_WD_FULL[weekday]}
                </Text>
              </VStack>
              <Drawer.CloseTrigger asChild>
                <IconButton aria-label="ปิด" size="sm" variant="ghost" borderRadius="full">
                  <X size={16} />
                </IconButton>
              </Drawer.CloseTrigger>
            </Drawer.Header>

            <Drawer.Body pb={2} overflowY="auto">
              <VStack align="stretch" gap={4}>
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={1}>
                    คนปัจจุบัน
                  </Text>
                  <Text fontSize="md" fontWeight="semibold">
                    {formatDutyDisplayName(currentName)}
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={2}>
                    เลือกคนใหม่
                  </Text>
                  {loadError && (
                    <Text fontSize="sm" color="holiday.fg" mb={2}>
                      {loadError}
                    </Text>
                  )}
                  {isLoading && !options.length ? (
                    <Text fontSize="sm" color="fg.muted">
                      กำลังโหลด…
                    </Text>
                  ) : (
                    <VStack align="stretch" gap={0}>
                      {options.map((opt) => {
                        const active = selected === opt.value;
                        return (
                          <Box
                            key={opt.value}
                            as="button"
                            textAlign="left"
                            py={3}
                            px={2}
                            borderTopWidth="1px"
                            borderColor="glass.border"
                            bg={active ? "brand.subtle" : "transparent"}
                            borderRadius="md"
                            onClick={() => setSelected(opt.value)}
                            _first={{ borderTopWidth: 0 }}
                          >
                            <HStack gap={3}>
                              <Box
                                w="18px"
                                h="18px"
                                borderRadius="full"
                                borderWidth="2px"
                                borderColor={active ? "brand.solid" : "fg.muted"}
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                flexShrink={0}
                              >
                                {active && (
                                  <Box w="8px" h="8px" borderRadius="full" bg="brand.solid" />
                                )}
                              </Box>
                              <Text fontSize="md" fontWeight={active ? "semibold" : "medium"}>
                                {opt.label}
                              </Text>
                            </HStack>
                          </Box>
                        );
                      })}
                      {!options.length && !loadError && (
                        <Text fontSize="sm" color="fg.muted" py={2}>
                          ไม่มีรายชื่อในเดือนนี้
                        </Text>
                      )}
                    </VStack>
                  )}
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={2}>
                    สถานะพิเศษ
                  </Text>
                  <Box
                    as="button"
                    textAlign="left"
                    py={3}
                    px={2}
                    w="full"
                    bg={selected === "งด" ? "brand.subtle" : "transparent"}
                    borderRadius="md"
                    onClick={() => setSelected("งด")}
                  >
                    <HStack gap={3}>
                      <Box
                        w="18px"
                        h="18px"
                        borderRadius="full"
                        borderWidth="2px"
                        borderColor={selected === "งด" ? "brand.solid" : "fg.muted"}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                      >
                        {selected === "งด" && (
                          <Box w="8px" h="8px" borderRadius="full" bg="brand.solid" />
                        )}
                      </Box>
                      <Text fontSize="md" fontWeight={selected === "งด" ? "semibold" : "medium"}>
                        งด
                      </Text>
                    </HStack>
                  </Box>
                </Box>

                {saveError && (
                  <Text fontSize="sm" color="holiday.fg">
                    {saveError}
                  </Text>
                )}
              </VStack>
            </Drawer.Body>

            <Drawer.Footer
              gap={3}
              borderTopWidth="1px"
              borderColor="glass.border"
              pb="max(1rem, calc(0.5rem + env(safe-area-inset-bottom)))"
            >
              <Button variant="ghost" flex="1" onClick={() => onOpenChange(false)} disabled={isSaving}>
                ยกเลิก
              </Button>
              <Button colorPalette="brand" flex="1" onClick={handleSave} loading={isSaving} disabled={!canSave}>
                บันทึก
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
