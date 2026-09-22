"use client";

import { useState, useTransition } from "react";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  Field,
  Input,
  Portal,
  Text,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import { Stethoscope } from "lucide-react";

import { DigitBoxInput } from "@/components/ui/digit-box-input";
import { scrollFocusedIntoView } from "@/lib/scroll-into-view-on-focus";

import { updateCastLog } from "../lib/cast-actions";
import type { CastVisitSummary } from "../lib/cast-dashboard-actions";
import { castLabel } from "../lib/cast-types";
import { resolveDutyDoctor } from "../lib/duty-doctor";
import { CastTypePicker } from "./cast-type-picker";
import { ThaiDateInput } from "./thai-date-input";

const HN_LEN = 7;

type CastVisitEditDialogProps = {
  visit: CastVisitSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

function CastVisitEditForm({
  visit,
  onCancel,
  onSaved,
}: {
  visit: CastVisitSummary;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(visit.shiftDate);
  const [hn, setHn] = useState(visit.hn);
  const [name, setName] = useState(visit.patientName);
  const [diagnosis, setDiagnosis] = useState(visit.diagnosis);
  const [castItems, setCastItems] = useState(() => new Map(visit.casts.map((c) => [c.id, c.count])));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const doctorName = resolveDutyDoctor(date);

  const canSave =
    Boolean(
      date &&
        doctorName &&
        hn.trim().length === HN_LEN &&
        name.trim().length >= 3 &&
        diagnosis.trim().length > 0 &&
        castItems.size > 0
    ) && !isPending;

  const save = () => {
    if (!canSave || !doctorName) return;
    setError(null);

    startTransition(async () => {
      const result = await updateCastLog({
        visitId: visit.visitId,
        shiftDate: date,
        hn: hn.trim(),
        patientName: name.trim(),
        diagnosis: diagnosis.trim(),
        doctorName,
        casts: [...castItems].map(([id, count]) => ({ id, count })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onSaved();
    });
  };

  return (
    <>
      <Dialog.Body>
        <VStack align="stretch" gap={5}>
          <Field.Root>
            <Field.Label>วันที่</Field.Label>
            <ThaiDateInput value={date} onChange={setDate} />
          </Field.Root>

          {doctorName ? (
            <Badge
              colorPalette="brand"
              variant="subtle"
              borderRadius="full"
              px={4}
              py={2}
              fontSize="sm"
              fontWeight="semibold"
              display="inline-flex"
              alignItems="center"
              gap={2}
              w="fit-content"
            >
              <Stethoscope size={16} aria-hidden />
              {doctorName}
            </Badge>
          ) : (
            <Alert.Root status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>ไม่พบแพทย์เวรสำหรับวันที่นี้</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          <Field.Root>
            <Field.Label>ชื่อ-สกุล</Field.Label>
            <Input
              fontSize="16px"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => scrollFocusedIntoView(e.target)}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>HN</Field.Label>
            <DigitBoxInput length={HN_LEN} value={hn} onChange={setHn} ariaLabel="HN" />
          </Field.Root>

          <Field.Root>
            <Field.Label>วินิจฉัย</Field.Label>
            <Input
              fontSize="16px"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              onFocus={(e) => scrollFocusedIntoView(e.target)}
            />
          </Field.Root>

          <VStack align="stretch" gap={2}>
            <Text fontWeight="medium">ประเภทเฝือก</Text>
            <CastTypePicker value={castItems} onChange={setCastItems} />
          </VStack>

          {castItems.size > 0 && (
            <Wrap gap={2} justify="center">
              {[...castItems].map(([id, count]) => (
                <Badge key={id} colorPalette="brand" variant="subtle" borderRadius="full">
                  {castLabel(id)}
                  {count > 1 ? ` ×${count}` : ""}
                </Badge>
              ))}
            </Wrap>
          )}

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
        <Button variant="ghost" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button colorPalette="brand" disabled={!canSave} onClick={save}>
          {isPending ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
        </Button>
      </Dialog.Footer>
    </>
  );
}

export function CastVisitEditDialog({ visit, open, onOpenChange, onSaved }: CastVisitEditDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <Dialog.Backdrop backdropFilter="blur(4px)" />
        <Dialog.Positioner p={4}>
          <Dialog.Content
            maxW="lg"
            w="full"
            bg="glass.solid"
            backdropFilter="blur(16px)"
            borderWidth="1px"
            borderColor="glass.border"
          >
            <Dialog.Header>
              <Dialog.Title>แก้ไขรายการ</Dialog.Title>
            </Dialog.Header>
            {visit && open ? (
              <CastVisitEditForm
                key={visit.visitId}
                visit={visit}
                onCancel={() => onOpenChange(false)}
                onSaved={() => {
                  onOpenChange(false);
                  onSaved();
                }}
              />
            ) : null}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
