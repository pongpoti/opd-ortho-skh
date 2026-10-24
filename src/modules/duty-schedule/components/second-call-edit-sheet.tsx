"use client";

import { useState, useTransition } from "react";
import { Box, Button, Drawer, HStack, IconButton, Portal, Text, VStack } from "@chakra-ui/react";
import { Check, X } from "lucide-react";

import type { SecondCallConflict } from "../lib/second-call-assign";
import {
  saveSecondCallSubDuty,
  type SecondCallStaffOption,
  type SecondCallSubDutyView,
} from "../lib/second-call-actions";
import { SUB_DUTY_LABELS, subDutyWhen } from "../lib/second-call-labels";

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const THAI_WD_FULL = [
  "วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์",
];
const BE_OFFSET = 543;
const MAX_PEOPLE = 3;

function conflictText(reason: SecondCallConflict, sub: SecondCallSubDutyView): string {
  if (reason === "real") return "มีเวรจริงช่วงนี้";
  if (reason === "friday") return "มีเวรจริงวันศุกร์ก่อนหน้า";
  const weekday = new Date(sub.date.year, sub.date.month, sub.date.day).getDay();
  return `ไม่รับ${SUB_DUTY_LABELS[sub.shift].name}${THAI_WD_FULL[weekday]}`;
}

type SecondCallEditSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  /** Duty day the sub-duty belongs to. */
  day: number;
  subDuty: SecondCallSubDutyView;
  staff: SecondCallStaffOption[];
  minPerStaff: number;
  onSaved: () => void;
};

export function SecondCallEditSheet({
  open, onOpenChange, year, month, day, subDuty, staff, minPerStaff, onSaved,
}: SecondCallEditSheetProps) {
  // Mounted per edit (the day section unmounts it on close), so props seed state once.
  const [selected, setSelected] = useState<string[]>(subDuty.names);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const weekday = new Date(year, month, day).getDay();

  const unchanged = selected.length === subDuty.names.length && selected.every((name) => subDuty.names.includes(name));
  const canSave = selected.length > 0 && !unchanged && !isSaving;

  function toggle(name: string) {
    setSelected((current) => current.includes(name)
      ? current.filter((item) => item !== name)
      : current.length < MAX_PEOPLE ? [...current, name] : current);
  }

  function save(names: string[]) {
    setSaveError(null);
    startSave(async () => {
      const result = await saveSecondCallSubDuty({ year, month, day, shift: subDuty.shift, names });
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      onSaved();
      onOpenChange(false);
    });
  }

  return (
    <Drawer.Root placement="bottom" open={open} onOpenChange={(e) => onOpenChange(e.open)}>
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
            <Drawer.Header display="flex" alignItems="flex-start" justifyContent="space-between" gap={3}>
              <VStack align="start" gap={0}>
                <Drawer.Title fontSize="xl">
                  แก้ไข second-call {SUB_DUTY_LABELS[subDuty.shift].name}
                </Drawer.Title>
                <Text fontSize="sm" color="fg.muted">
                  เวร {day} {THAI_MONTHS_SHORT[month]} {year + BE_OFFSET} · {THAI_WD_FULL[weekday]} · {subDutyWhen(subDuty, day)}
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
                <HStack gap={6} align="start">
                  <Box>
                    <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={1}>เวรจริง</Text>
                    <Text fontSize="md" fontWeight="semibold">{subDuty.real ?? "-"}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={1}>
                      {subDuty.pinned ? "ตอนนี้ (แอดมินกำหนด)" : "ตอนนี้ (ระบบจัด)"}
                    </Text>
                    <Text fontSize="md" fontWeight="semibold">{subDuty.names.join(", ") || "-"}</Text>
                  </Box>
                </HStack>

                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={2}>
                    เลือก second-call (ไม่เกิน {MAX_PEOPLE} คน) · จำนวนครั้งในเดือนนี้
                  </Text>
                  <VStack align="stretch" gap={0}>
                    {staff.map((person) => {
                      const active = selected.includes(person.name);
                      const count = person.count + (active ? 1 : 0) - (subDuty.names.includes(person.name) ? 1 : 0);
                      const reason = person.conflicts[subDuty.shift];
                      const full = !active && selected.length >= MAX_PEOPLE;
                      return (
                        <Box
                          key={person.name}
                          as="button"
                          textAlign="left"
                          py={3}
                          px={2}
                          borderTopWidth="1px"
                          borderColor="glass.border"
                          bg={active ? "brand.subtle" : "transparent"}
                          borderRadius="md"
                          opacity={full ? 0.5 : 1}
                          aria-pressed={active}
                          aria-disabled={full || undefined}
                          onClick={() => toggle(person.name)}
                          _first={{ borderTopWidth: 0 }}
                        >
                          <HStack gap={3}>
                            <Box
                              w="18px" h="18px" borderRadius="sm" borderWidth="2px" flexShrink={0}
                              borderColor={active ? "brand.solid" : "fg.muted"}
                              bg={active ? "brand.solid" : "transparent"}
                              color="white" display="flex" alignItems="center" justifyContent="center"
                            >
                              {active && <Check size={12} strokeWidth={3} />}
                            </Box>
                            <VStack align="start" gap={0} flex="1" minW={0}>
                              <Text fontSize="md" fontWeight={active ? "semibold" : "medium"}>{person.name}</Text>
                              {reason && (
                                <Text fontSize="xs" color="holiday.fg">{conflictText(reason, subDuty)}</Text>
                              )}
                            </VStack>
                            <Text
                              fontSize="xs" fontWeight="bold" px={2} py={0.5} borderRadius="full" flexShrink={0}
                              color={count < minPerStaff ? "holiday.fg" : "fg.muted"}
                              bg={count < minPerStaff ? "holiday.subtle" : "transparent"}
                            >
                              {count} ครั้ง
                            </Text>
                          </HStack>
                        </Box>
                      );
                    })}
                  </VStack>
                </Box>

                <Text fontSize="xs" color="fg.muted">
                  ช่วงที่แอดมินกำหนดจะไม่ถูกระบบเปลี่ยน ถ้าการแก้นี้ทำให้ใครได้ไม่ถึง {minPerStaff} ครั้ง
                  ระบบจะจัดวันหลังจากวันนี้ใหม่ให้เอง
                </Text>

                {saveError && <Text fontSize="sm" color="holiday.fg">{saveError}</Text>}
              </VStack>
            </Drawer.Body>

            <Drawer.Footer
              gap={3}
              borderTopWidth="1px"
              borderColor="glass.border"
              pb="max(1rem, calc(0.5rem + env(safe-area-inset-bottom)))"
              flexWrap="wrap"
            >
              {subDuty.pinned && (
                <Button variant="outline" w="full" onClick={() => save([])} disabled={isSaving}>
                  ให้ระบบจัดเอง
                </Button>
              )}
              <Button variant="ghost" flex="1" onClick={() => onOpenChange(false)} disabled={isSaving}>
                ยกเลิก
              </Button>
              <Button colorPalette="brand" flex="1" onClick={() => save(selected)} loading={isSaving} disabled={!canSave}>
                บันทึก
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
