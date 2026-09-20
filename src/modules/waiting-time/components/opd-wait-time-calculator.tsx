"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Circle,
  Field,
  Heading,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ClipboardList, Minus, Plus } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import {
  buddhistYearToGregorian,
  calculateWaitTimes,
  getLastDayOfMonth,
  makeSummary,
  parseAndValidateFilePart,
  toMonthKey,
  type CalculationResult,
} from "../lib/opd-calculator";

const MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const BUDDHIST_YEAR_VALID = /^25\d{2}$/;
const MIN_BUDDHIST_YEAR = 2500;
const MAX_BUDDHIST_YEAR = 2599;
const CURRENT_BUDDHIST_YEAR = new Date().getFullYear() + 543;

function StepBadge({ n }: { n: number }) {
  return (
    <Circle size={6} bg="brand.subtle" color="brand.fg" fontSize="xs" fontWeight="semibold">
      {n}
    </Circle>
  );
}

export function OpdWaitTimeCalculator() {
  const [month, setMonth] = useState<string>("");
  const [buddhistYear, setBuddhistYear] = useState(CURRENT_BUDDHIST_YEAR);
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isMonthFilled = month !== "";
  const isYearValid = BUDDHIST_YEAR_VALID.test(String(buddhistYear));
  const canUploadFile1 = isMonthFilled && isYearValid;
  const canUploadFile2 = canUploadFile1 && file1 !== null;

  const canSubmit = isMonthFilled && isYearValid && file1 && file2 && !loading;

  function decrementYear() {
    setBuddhistYear((y) => Math.max(MIN_BUDDHIST_YEAR, y - 1));
  }

  function incrementYear() {
    setBuddhistYear((y) => Math.min(MAX_BUDDHIST_YEAR, y + 1));
  }

  async function handleSubmit() {
    setError(null);
    setResult(null);
    setSummary(null);
    setLoading(true);

    try {
      const monthNum = Number(month);
      const gregorianYear = buddhistYearToGregorian(buddhistYear);
      const monthKey = toMonthKey(gregorianYear, monthNum);
      const lastDay = getLastDayOfMonth(gregorianYear, monthNum);

      const firstRange = { startDay: 1, endDay: 15 };
      const secondRange = { startDay: 16, endDay: lastDay };

      const [text1, text2] = await Promise.all([file1!.text(), file2!.text()]);

      const parsed1 = parseAndValidateFilePart(text1, monthKey, firstRange);
      const parsed2 = parseAndValidateFilePart(text2, monthKey, secondRange);

      const calcResult = calculateWaitTimes(
        monthKey,
        { parsed: parsed1, range: firstRange },
        { parsed: parsed2, range: secondRange }
      );

      setResult(calcResult);
      setSummary(makeSummary(calcResult));
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <VStack gap={8} align="stretch">
      <GlassCard p={8}>
        <VStack align="stretch" gap={5}>
          <HStack gap={2}>
            <StepBadge n={1} />
            <Text fontWeight="medium">ระบุเดือนและปี</Text>
          </HStack>
          <HStack gap={6} align="start" flexWrap="wrap">
            <Field.Root flex="1" minW="200px">
              <Field.Label>เดือน</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={month} onChange={(e) => setMonth(e.target.value)}>
                  <option value="" disabled>
                    เลือกเดือน
                  </option>
                  {MONTHS.map((name, i) => (
                    <option key={name} value={String(i + 1)}>
                      {name}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root flex="1" minW="200px">
              <Field.Label>ปี (พ.ศ.)</Field.Label>
              <HStack gap={3}>
                <IconButton
                  aria-label="ปีก่อนหน้า"
                  size="sm"
                  variant="outline"
                  onClick={decrementYear}
                  disabled={!isMonthFilled || buddhistYear <= MIN_BUDDHIST_YEAR}
                >
                  <Minus size={16} />
                </IconButton>
                <Text minW="56px" textAlign="center" fontSize="lg" fontWeight="bold">
                  {buddhistYear}
                </Text>
                <IconButton
                  aria-label="ปีถัดไป"
                  size="sm"
                  variant="outline"
                  onClick={incrementYear}
                  disabled={!isMonthFilled || buddhistYear >= MAX_BUDDHIST_YEAR}
                >
                  <Plus size={16} />
                </IconButton>
              </HStack>
              <Field.HelperText>ค่าเริ่มต้นคือปีปัจจุบัน กดปุ่มเพื่อเปลี่ยนปี</Field.HelperText>
            </Field.Root>
          </HStack>
        </VStack>
      </GlassCard>

      <GlassCard p={8}>
        <VStack align="stretch" gap={6}>
          <VStack align="stretch" gap={5} opacity={canUploadFile1 ? 1 : 0.6}>
            <HStack gap={2}>
              <StepBadge n={2} />
              <Text fontWeight="medium">อัปโหลดไฟล์ข้อมูล</Text>
            </HStack>
            <HStack gap={6} align="start" flexWrap="wrap">
              <Field.Root flex="1" minW="200px">
                <Field.Label>ไฟล์ที่ 1 (วันที่ 1–15)</Field.Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile1(e.target.files?.[0] ?? null)}
                  disabled={!canUploadFile1}
                  p={1}
                />
              </Field.Root>

              <Field.Root flex="1" minW="200px">
                <Field.Label>ไฟล์ที่ 2 (วันที่ 16–สิ้นเดือน)</Field.Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile2(e.target.files?.[0] ?? null)}
                  disabled={!canUploadFile2}
                  p={1}
                />
              </Field.Root>
            </HStack>

            {(file1 || file2) && (
              <Alert.Root status="info">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>ไฟล์ที่อัปโหลดแล้ว</Alert.Title>
                  <Alert.Description>
                    <VStack align="start" gap={0.5}>
                      {file1 && <Text>ไฟล์ที่ 1: {file1.name}</Text>}
                      {file2 && <Text>ไฟล์ที่ 2: {file2.name}</Text>}
                    </VStack>
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}
          </VStack>

          <Box>
            <Button onClick={handleSubmit} disabled={!canSubmit} colorPalette="brand" w="fit-content">
              {loading ? "กำลังคำนวณ…" : "คำนวณ"}
            </Button>
          </Box>

          {error && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}
        </VStack>
      </GlassCard>

      {result && (
        <GlassCard p={8}>
          <VStack gap={6} align="stretch">
            <VStack align="start" gap={1}>
              <Heading size="lg">
                <HStack gap={2}>
                  <Circle size={8} bg="brand.subtle" color="brand.fg">
                    <ClipboardList size={16} />
                  </Circle>
                  <span>ผลลัพธ์</span>
                </HStack>
              </Heading>
              {summary && <Text color="fg.muted">{summary}</Text>}
            </VStack>

            <Table.Root size="sm">
              <Table.Header>
                <Table.Row bg="brand.subtle">
                  <Table.ColumnHeader color="brand.fg">กลุ่ม</Table.ColumnHeader>
                  <Table.ColumnHeader color="brand.fg">ค่าเฉลี่ย (ชม:นาที:วินาที)</Table.ColumnHeader>
                  <Table.ColumnHeader color="brand.fg">ค่าเฉลี่ย (นาที)</Table.ColumnHeader>
                  <Table.ColumnHeader color="brand.fg">จำนวนรายการ</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                <Table.Row>
                  <Table.Cell>โดยรวม</Table.Cell>
                  <Table.Cell>{result.all.durationHms}</Table.Cell>
                  <Table.Cell>{result.all.durationMinutes}</Table.Cell>
                  <Table.Cell>{result.all.count}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>แพทย์ประจำ</Table.Cell>
                  <Table.Cell>{result.staff.durationHms}</Table.Cell>
                  <Table.Cell>{result.staff.durationMinutes}</Table.Cell>
                  <Table.Cell>{result.staff.count}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>แพทย์หมุนเวียน</Table.Cell>
                  <Table.Cell>{result.nonStaff.durationHms}</Table.Cell>
                  <Table.Cell>{result.nonStaff.durationMinutes}</Table.Cell>
                  <Table.Cell>{result.nonStaff.count}</Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Root>
          </VStack>
        </GlassCard>
      )}
    </VStack>
  );
}
