"use client";

import { useState, useTransition } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Circle,
  Field,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  Text,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import { Minus, Plus } from "lucide-react";

import { DigitBoxInput } from "@/components/ui/digit-box-input";
import { GlassCard } from "@/components/ui/glass-card";
import { PHYSICIANS } from "@/lib/physicians";
import { scrollFocusedIntoView } from "@/lib/scroll-into-view-on-focus";

import { submitCastLog } from "../lib/cast-actions";
import { CAST_TYPES, castLabel } from "../lib/cast-types";
import { CastIcon } from "../lib/cast-icons";

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

type SyncStatus = "saving" | "saved" | "failed";

interface LogEntry {
  id: string;
  date: string;
  hn: string;
  name: string;
  doctorName: string;
  casts: Array<{ id: string; count: number }>;
  sync: SyncStatus;
}

export function CastRoomForm() {
  const [date, setDate] = useState(todayISO());
  const [doctorName, setDoctorName] = useState("");
  const [hn, setHn] = useState("");
  const [name, setName] = useState("");
  const [castItems, setCastItems] = useState<Map<string, number>>(new Map());
  const [log, setLog] = useState<LogEntry[]>([]);
  const [isPending, startTransition] = useTransition();

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
    Boolean(date && doctorName && hn.trim().length === HN_LEN && name.trim().length >= 3 && castItems.size > 0) &&
    !isPending;

  const submit = () => {
    if (!canSubmit) return;

    const id = crypto.randomUUID();
    const casts = [...castItems].map(([castId, count]) => ({ id: castId, count }));
    const entry: LogEntry = { id, date, hn: hn.trim(), name: name.trim(), doctorName, casts, sync: "saving" };

    setLog((l) => [entry, ...l]);
    const submittedDate = date;
    const submittedHn = hn.trim();
    const submittedName = name.trim();
    const submittedDoctor = doctorName;

    setHn("");
    setName("");
    setCastItems(new Map());

    startTransition(async () => {
      const result = await submitCastLog({
        visitId: id,
        shiftDate: submittedDate,
        hn: submittedHn,
        patientName: submittedName,
        doctorName: submittedDoctor,
        casts,
      });
      setLog((l) => l.map((e) => (e.id === id ? { ...e, sync: result.ok ? "saved" : "failed" } : e)));
    });
  };

  return (
    <VStack gap={6} align="stretch">
      <GlassCard p={6}>
        <VStack align="stretch" gap={6}>
          <VStack align="stretch" gap={5}>
            <HStack gap={2}>
              <StepBadge n={1} />
              <Text fontWeight="medium">วันที่</Text>
            </HStack>
            <Field.Root maxW="240px">
              <Input type="date" fontSize="16px" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field.Root>
          </VStack>

          <VStack align="stretch" gap={5}>
            <HStack gap={2}>
              <StepBadge n={2} />
              <Text fontWeight="medium">เลือกแพทย์</Text>
            </HStack>
            <Field.Root maxW="360px">
              <NativeSelect.Root>
                <NativeSelect.Field
                  aria-label="เลือกแพทย์"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                >
                  <option value="" disabled>
                    -- เลือกแพทย์ --
                  </option>
                  {PHYSICIANS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          </VStack>

          <VStack align="stretch" gap={5}>
            <HStack gap={2}>
              <StepBadge n={3} />
              <Text fontWeight="medium">ข้อมูลผู้ป่วย</Text>
            </HStack>

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
              <Field.Label>ชื่อ-สกุล</Field.Label>
              <Input
                fontSize="16px"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={(e) => scrollFocusedIntoView(e.target)}
                aria-label="ชื่อ-สกุล"
              />
              <Field.HelperText color="fg.muted">อย่าลืมใส่คำนำหน้านะ</Field.HelperText>
            </Field.Root>
          </VStack>

          <VStack align="stretch" gap={5}>
            <HStack gap={2}>
              <StepBadge n={4} />
              <Text fontWeight="medium">ใส่เฝือกแบบไหน ?</Text>
            </HStack>

            <Wrap gap={4}>
              {CAST_TYPES.map((t) => {
                const count = castItems.get(t.id) ?? 0;
                const active = count > 0;
                return (
                  <HStack key={t.id} gap={2}>
                    <Button
                      type="button"
                      size="sm"
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
                      borderWidth="1px"
                      borderColor="border"
                      borderRadius="full"
                      opacity={active ? 1 : 0.5}
                      px={1}
                    >
                      <IconButton
                        aria-label={`ลดจำนวน ${t.label}`}
                        size="2xs"
                        variant="ghost"
                        disabled={count === 0}
                        onClick={() => setCastCount(t.id, count - 1)}
                      >
                        <Minus size={14} />
                      </IconButton>
                      <Text minW="5" textAlign="center" fontSize="sm" fontWeight="semibold">
                        {count}
                      </Text>
                      <IconButton
                        aria-label={`เพิ่มจำนวน ${t.label}`}
                        size="2xs"
                        variant="ghost"
                        onClick={() => setCastCount(t.id, count + 1)}
                      >
                        <Plus size={14} />
                      </IconButton>
                    </HStack>
                  </HStack>
                );
              })}
            </Wrap>

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

          <Box>
            <Button onClick={submit} disabled={!canSubmit} colorPalette="brand" w="fit-content">
              {isPending ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
            </Button>
          </Box>
        </VStack>
      </GlassCard>

      {log.length > 0 && (
        <VStack align="stretch" gap={3}>
          <Text fontSize="sm" fontWeight="semibold" color="fg.muted">
            {log.length} รายการในรอบนี้
          </Text>
          {log.map((r) => (
            <GlassCard key={r.id} p={4}>
              <VStack align="stretch" gap={1}>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="fg.muted">
                    {r.date}
                  </Text>
                  <HStack gap={2}>
                    {r.sync === "saving" && (
                      <Badge colorPalette="yellow" variant="subtle">
                        กำลังบันทึก
                      </Badge>
                    )}
                    {r.sync === "failed" && (
                      <Badge colorPalette="red" variant="subtle">
                        บันทึกไม่สำเร็จ
                      </Badge>
                    )}
                    <Text fontFamily="mono" fontWeight="bold" color="brand.fg">
                      {r.hn}
                    </Text>
                  </HStack>
                </HStack>
                <Text fontWeight="semibold">{r.name}</Text>
                <Text fontSize="sm" color="fg.muted">
                  {r.doctorName}
                </Text>
                <Wrap gap={1.5} pt={1}>
                  {r.casts.map(({ id, count }) => (
                    <Badge key={id} colorPalette="brand" variant="subtle" borderRadius="full">
                      {castLabel(id)}
                      {count > 1 ? ` ×${count}` : ""}
                    </Badge>
                  ))}
                </Wrap>
              </VStack>
            </GlassCard>
          ))}
        </VStack>
      )}

      {log.some((r) => r.sync === "failed") && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>มีรายการที่บันทึกไม่สำเร็จ กรุณาลองบันทึกใหม่อีกครั้ง</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}
    </VStack>
  );
}
