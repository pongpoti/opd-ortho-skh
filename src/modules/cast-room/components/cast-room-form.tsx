"use client";

import { useState, useTransition } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Circle,
  Dialog,
  Field,
  HStack,
  IconButton,
  Input,
  Portal,
  Text,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import { Minus, Plus } from "lucide-react";

import { DigitBoxInput } from "@/components/ui/digit-box-input";
import { GlassCard } from "@/components/ui/glass-card";
import { scrollFocusedIntoView } from "@/lib/scroll-into-view-on-focus";

import { submitCastLog, updateCastLog } from "../lib/cast-actions";
import { CAST_TYPES, castLabel } from "../lib/cast-types";
import { CastIcon } from "../lib/cast-icons";
import { resolveDutyDoctor } from "../lib/duty-doctor";
import { formatThaiDate } from "../lib/thai-date";
import { ThaiDateInput } from "./thai-date-input";

const HN_LEN = 7;

function StepBadge({ n }: { n: number }) {
  return (
    <Circle size={6} bg="brand.subtle" color="brand.fg" fontSize="xs" fontWeight="semibold">
      {n}
    </Circle>
  );
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hnHint(value: string): string | null {
  if (!value) return null;
  return value.length < HN_LEN ? `ต้องมีให้ครบ ${HN_LEN} หลัก` : null;
}

interface ConfirmedEntry {
  visitId: string;
  date: string;
  doctorName: string;
  hn: string;
  name: string;
  diagnosis: string;
  casts: Array<{ id: string; count: number }>;
}

export function CastRoomForm() {
  const [date, setDate] = useState(todayISO());
  const [hn, setHn] = useState("");
  const [name, setName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [castItems, setCastItems] = useState<Map<string, number>>(new Map());
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [confirmedEntry, setConfirmedEntry] = useState<ConfirmedEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const doctorName = resolveDutyDoctor(date);

  const setCastCount = (id: string, count: number) => {
    setCastItems((prev) => {
      const next = new Map(prev);
      if (count > 0) next.set(id, count);
      else next.delete(id);
      return next;
    });
  };

  const toggleCastType = (id: string) => {
    setCastCount(id, castItems.has(id) ? 0 : 1);
  };

  const canSubmit =
    Boolean(
      date &&
        doctorName &&
        hn.trim().length === HN_LEN &&
        name.trim().length >= 3 &&
        diagnosis.trim().length > 0 &&
        castItems.size > 0
    ) && !isPending;

  const resetForm = () => {
    setEditingVisitId(null);
    setDate(todayISO());
    setHn("");
    setName("");
    setDiagnosis("");
    setCastItems(new Map());
  };

  const submit = () => {
    if (!canSubmit || !doctorName) return;
    setSubmitError(null);

    const visitId = editingVisitId ?? crypto.randomUUID();
    const casts = [...castItems].map(([id, count]) => ({ id, count }));
    const payload = {
      visitId,
      shiftDate: date,
      hn: hn.trim(),
      patientName: name.trim(),
      diagnosis: diagnosis.trim(),
      doctorName,
      casts,
    };
    const isEditing = Boolean(editingVisitId);

    startTransition(async () => {
      const result = isEditing ? await updateCastLog(payload) : await submitCastLog(payload);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      setConfirmedEntry({
        visitId,
        date: payload.shiftDate,
        doctorName,
        hn: payload.hn,
        name: payload.patientName,
        diagnosis: payload.diagnosis,
        casts,
      });
      setDialogOpen(true);
      setEditingVisitId(null);
      setHn("");
      setName("");
      setDiagnosis("");
      setCastItems(new Map());
    });
  };

  const handleEdit = () => {
    if (!confirmedEntry) return;
    setDate(confirmedEntry.date);
    setHn(confirmedEntry.hn);
    setName(confirmedEntry.name);
    setDiagnosis(confirmedEntry.diagnosis);
    setCastItems(new Map(confirmedEntry.casts.map((c) => [c.id, c.count])));
    setEditingVisitId(confirmedEntry.visitId);
    setDialogOpen(false);
  };

  return (
    <VStack gap={6} align="stretch">
      <GlassCard p={6}>
        <VStack align="stretch" gap={6}>
          {editingVisitId && (
            <Alert.Root status="info">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>กำลังแก้ไขรายการที่บันทึกไว้</Alert.Description>
              </Alert.Content>
              <Button size="xs" variant="ghost" onClick={resetForm}>
                ยกเลิก
              </Button>
            </Alert.Root>
          )}

          <VStack align="stretch" gap={5}>
            <HStack gap={2}>
              <StepBadge n={1} />
              <Text fontWeight="medium">วันที่</Text>
            </HStack>
            <Field.Root>
              <ThaiDateInput value={date} onChange={setDate} />
            </Field.Root>
          </VStack>

          <VStack align="stretch" gap={5}>
            <HStack gap={2}>
              <StepBadge n={2} />
              <Text fontWeight="medium">แพทย์</Text>
            </HStack>
            {doctorName ? (
              <Text fontWeight="semibold">{doctorName}</Text>
            ) : (
              <Alert.Root status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>ไม่พบแพทย์เวรสำหรับวันที่นี้ กรุณาตรวจสอบตารางเวร</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}
          </VStack>

          <VStack align="stretch" gap={5}>
            <HStack gap={2}>
              <StepBadge n={3} />
              <Text fontWeight="medium">ข้อมูลผู้ป่วย</Text>
            </HStack>

            <Field.Root>
              <Field.Label>ชื่อ-สกุล</Field.Label>
              <Input
                fontSize="16px"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={(e) => scrollFocusedIntoView(e.target)}
                aria-label="ชื่อ-สกุล"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>HN</Field.Label>
              <DigitBoxInput
                length={HN_LEN}
                value={hn}
                onChange={setHn}
                ariaLabel="HN"
                describedBy={hnHint(hn) ? "cast-room-hn-msg" : undefined}
              />
              {hnHint(hn) && (
                <Field.HelperText id="cast-room-hn-msg" color="fg.muted">
                  {hnHint(hn)}
                </Field.HelperText>
              )}
            </Field.Root>

            <Field.Root>
              <Field.Label>วินิจฉัย</Field.Label>
              <Input
                fontSize="16px"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                onFocus={(e) => scrollFocusedIntoView(e.target)}
                aria-label="วินิจฉัย"
              />
            </Field.Root>
          </VStack>

          <VStack align="stretch" gap={5}>
            <HStack gap={2}>
              <StepBadge n={4} />
              <Text fontWeight="medium">ประเภทเฝือก</Text>
            </HStack>

            <VStack align="stretch" gap={3}>
              {CAST_TYPES.map((t) => {
                const count = castItems.get(t.id) ?? 0;
                const active = count > 0;
                return (
                  <HStack key={t.id} justify="space-between" gap={3}>
                    <Button
                      type="button"
                      size="lg"
                      fontSize="md"
                      borderRadius="full"
                      variant={active ? "solid" : "outline"}
                      colorPalette="brand"
                      aria-pressed={active}
                      onClick={() => toggleCastType(t.id)}
                    >
                      <CastIcon id={t.id} />
                      {t.label}
                    </Button>
                    <HStack
                      gap={0}
                      flexShrink={0}
                      borderWidth="1px"
                      borderColor="border"
                      borderRadius="full"
                      opacity={active ? 1 : 0.5}
                      px={1}
                    >
                      <IconButton
                        aria-label={`ลดจำนวน ${t.label}`}
                        size="sm"
                        variant="ghost"
                        disabled={count === 0}
                        onClick={() => setCastCount(t.id, count - 1)}
                      >
                        <Minus size={16} />
                      </IconButton>
                      <Text minW="6" textAlign="center" fontSize="md" fontWeight="semibold">
                        {count}
                      </Text>
                      <IconButton
                        aria-label={`เพิ่มจำนวน ${t.label}`}
                        size="sm"
                        variant="ghost"
                        onClick={() => setCastCount(t.id, count + 1)}
                      >
                        <Plus size={16} />
                      </IconButton>
                    </HStack>
                  </HStack>
                );
              })}
            </VStack>

            {castItems.size === 0 ? (
              <Text fontSize="sm" color="fg.muted">
                ยังไม่ได้เลือกเฝือก — แตะที่รายการด้านบน
              </Text>
            ) : (
              <Wrap gap={2}>
                {[...castItems].map(([id, count]) => (
                  <Badge key={id} colorPalette="brand" variant="subtle" borderRadius="full" px={3} py={1}>
                    {castLabel(id)}
                    {count > 1 ? ` ×${count}` : ""}
                  </Badge>
                ))}
              </Wrap>
            )}
          </VStack>

          {submitError && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{submitError}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          <Box>
            <Button onClick={submit} disabled={!canSubmit} colorPalette="brand" w="fit-content">
              {isPending ? "กำลังบันทึก…" : editingVisitId ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
            </Button>
          </Box>
        </VStack>
      </GlassCard>

      <Dialog.Root open={dialogOpen} onOpenChange={(e) => setDialogOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop backdropFilter="blur(4px)" />
          <Dialog.Positioner>
            <Dialog.Content
              bg="glass.solid"
              backdropFilter="blur(16px)"
              borderWidth="1px"
              borderColor="glass.border"
            >
              <Dialog.Header>
                <Dialog.Title>บันทึกข้อมูลสำเร็จ</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {confirmedEntry && (
                  <VStack align="stretch" gap={1} bg="bg.muted" p={4} borderRadius="lg" fontSize="sm">
                    <Text fontWeight="semibold">{formatThaiDate(confirmedEntry.date)}</Text>
                    <Text color="fg.muted">{confirmedEntry.doctorName}</Text>
                    <HStack>
                      <Text as="span" color="fg.muted">
                        HN:
                      </Text>
                      <Text fontFamily="mono">{confirmedEntry.hn}</Text>
                    </HStack>
                    <Text fontWeight="semibold">{confirmedEntry.name}</Text>
                    <Text color="fg.muted">{confirmedEntry.diagnosis}</Text>
                    <Wrap gap={1.5} pt={1}>
                      {confirmedEntry.casts.map(({ id, count }) => (
                        <Badge key={id} colorPalette="brand" variant="subtle" borderRadius="full">
                          {castLabel(id)}
                          {count > 1 ? ` ×${count}` : ""}
                        </Badge>
                      ))}
                    </Wrap>
                  </VStack>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="ghost" onClick={handleEdit}>
                  แก้ไข
                </Button>
                <Button colorPalette="brand" onClick={() => setDialogOpen(false)}>
                  เสร็จสิ้น
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </VStack>
  );
}
