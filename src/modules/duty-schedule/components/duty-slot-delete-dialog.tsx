"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Dialog, Portal, Text, VStack } from "@chakra-ui/react";

import { DUTY_LABELS, type DutyKey } from "../lib/duty-data";
import { deleteDutySlot } from "../lib/duty-actions";

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const BE_OFFSET = 543;

type DutySlotDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  day: number;
  dutyKey: DutyKey;
  personName: string;
  onDeleted: () => void;
};

export function DutySlotDeleteDialog({
  open,
  onOpenChange,
  year,
  month,
  day,
  dutyKey,
  personName,
  onDeleted,
}: DutySlotDeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  function confirm() {
    setError(null);
    startDelete(async () => {
      const result = await deleteDutySlot({ year, month, day, dutyKey });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDeleted();
      onOpenChange(false);
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        onOpenChange(e.open);
        if (!e.open) setError(null);
      }}
    >
      <Portal>
        <Dialog.Backdrop backdropFilter="blur(4px)" />
        <Dialog.Positioner p={4}>
          <Dialog.Content
            maxW="md"
            w="full"
            bg="glass.solid"
            backdropFilter="blur(16px)"
            borderWidth="1px"
            borderColor="glass.border"
          >
            <Dialog.Header>
              <Dialog.Title>ยืนยันการลบ</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap={3}>
                <Text>
                  ต้องการลบ «{personName}» ออกจาก {DUTY_LABELS[dutyKey]} วันที่ {day}{" "}
                  {THAI_MONTHS_SHORT[month]} {year + BE_OFFSET} หรือไม่?
                </Text>
                {error && (
                  <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{error}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isDeleting}>
                ยกเลิก
              </Button>
              <Button colorPalette="red" onClick={confirm} loading={isDeleting}>
                ลบ
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
