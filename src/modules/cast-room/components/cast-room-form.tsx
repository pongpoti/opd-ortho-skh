"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Circle,
  Dialog,
  Field,
  Flex,
  HStack,
  Input,
  Portal,
  Text,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import { Stethoscope } from "lucide-react";

import { BackToTopButton } from "@/components/back-to-top-button";
import { DigitBoxInput } from "@/components/ui/digit-box-input";
import { GlassCard } from "@/components/ui/glass-card";
import { scrollFocusedIntoView } from "@/lib/scroll-into-view-on-focus";

import { submitCastLog, updateCastLog } from "../lib/cast-actions";
import { castLabel } from "../lib/cast-types";
import { resolveDutyDoctorAction } from "../lib/duty-doctor-actions";
import { formatThaiDate, nowHHMM } from "../lib/thai-date";
import { CastTypePicker } from "./cast-type-picker";
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
  time: string | null;
  doctorName: string;
  hn: string;
  name: string;
  diagnosis: string;
  casts: Array<{ id: string; count: number }>;
}

export function CastRoomForm() {
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [useCurrentTime, setUseCurrentTime] = useState(false);
  const [hn, setHn] = useState("");
  const [name, setName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [castItems, setCastItems] = useState<Map<string, number>>(new Map());
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [confirmedEntry, setConfirmedEntry] = useState<ConfirmedEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [doctorName, setDoctorName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDoctorName(null);
    resolveDutyDoctorAction(date).then((name) => {
      if (!cancelled) setDoctorName(name);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

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
    setTime("");
    setUseCurrentTime(false);
    setHn("");
    setName("");
    setDiagnosis("");
    setCastItems(new Map());
  };

  const submit = () => {
    if (!canSubmit || !doctorName) return;
    setSubmitError(null);

    const casts = [...castItems].map(([id, count]) => ({ id, count }));
    const payload = {
      shiftDate: date,
      // "Use current time" means the time of saving, not of closing the picker.
      visitTime: useCurrentTime ? nowHHMM() : time || null,
      hn: hn.trim(),
      patientName: name.trim(),
      diagnosis: diagnosis.trim(),
      doctorName,
      casts,
    };
    const editingId = editingVisitId;

    startTransition(async () => {
      let visitId: string;
      if (editingId) {
        const result = await updateCastLog({ ...payload, visitId: editingId });
        if (!result.ok) {
          setSubmitError(result.error);
          return;
        }
        visitId = editingId;
      } else {
        const result = await submitCastLog(payload);
        if (!result.ok) {
          setSubmitError(result.error);
          return;
        }
        visitId = result.visitId;
      }
      setConfirmedEntry({
        visitId,
        date: payload.shiftDate,
        time: payload.visitTime,
        doctorName,
        hn: payload.hn,
        name: payload.patientName,
        diagnosis: payload.diagnosis,
        casts,
      });
      setDialogOpen(true);
      setEditingVisitId(null);
      // A hand-picked time belongs to this patient only; don't carry it over.
      if (!useCurrentTime) setTime("");
      setHn("");
      setName("");
      setDiagnosis("");
      setCastItems(new Map());
    });
  };

  const handleEdit = () => {
    if (!confirmedEntry) return;
    setDate(confirmedEntry.date);
    // Edit the time that was saved, not a live clock.
    setUseCurrentTime(false);
    setTime(confirmedEntry.time ?? "");
    setHn(confirmedEntry.hn);
    setName(confirmedEntry.name);
    setDiagnosis(confirmedEntry.diagnosis);
    setCastItems(new Map(confirmedEntry.casts.map((c) => [c.id, c.count])));
    setEditingVisitId(confirmedEntry.visitId);
    setDialogOpen(false);
  };

  return (
    <VStack gap={6} align="stretch">
      <GlassCard variant="solid" p={6}>
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
              <ThaiDateInput
                value={date}
                onChange={setDate}
                time={time}
                onTimeChange={setTime}
                useCurrentTime={useCurrentTime}
                onUseCurrentTimeChange={setUseCurrentTime}
              />
            </Field.Root>
          </VStack>

          <VStack align="stretch" gap={4}>
            <HStack gap={2}>
              <StepBadge n={2} />
              <Text fontWeight="medium">แพทย์</Text>
            </HStack>
            {doctorName ? (
              <Badge
                colorPalette="brand"
                variant="subtle"
                borderRadius="full"
                px={4}
                py={2}
                fontSize="md"
                fontWeight="semibold"
                display="inline-flex"
                alignItems="center"
                gap={2}
                w="fit-content"
              >
                <Stethoscope size={18} aria-hidden />
                {doctorName}
              </Badge>
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

            <CastTypePicker value={castItems} onChange={setCastItems} />

            {castItems.size === 0 ? (
              <Text fontSize="sm" color="fg.muted" textAlign="center">
                ยังไม่ได้เลือกเฝือก — แตะการ์ดด้านบนเพื่อเลือกประเภท
              </Text>
            ) : (
              <Flex justify="center" w="full">
                <Wrap gap={2} justify="center">
                  {[...castItems].map(([id, count]) => (
                    <Badge key={id} colorPalette="brand" variant="subtle" borderRadius="full" px={3} py={1}>
                      {castLabel(id)}
                      {count > 1 ? ` ×${count}` : ""}
                    </Badge>
                  ))}
                </Wrap>
              </Flex>
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
                    <Text fontWeight="semibold">
                      {formatThaiDate(confirmedEntry.date)}
                      {confirmedEntry.time ? ` · ${confirmedEntry.time}` : ""}
                    </Text>
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

      <BackToTopButton />
    </VStack>
  );
}
