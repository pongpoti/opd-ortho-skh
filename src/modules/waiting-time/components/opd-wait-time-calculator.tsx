"use client";

import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Circle,
  Field,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ClipboardList } from "lucide-react";

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

function YearDigitBox({
  ref,
  ...props
}: React.ComponentProps<typeof Input> & { ref?: React.Ref<HTMLInputElement> }) {
  return (
    <Input
      ref={ref}
      w="44px"
      px={0}
      textAlign="center"
      fontSize="lg"
      fontWeight="bold"
      {...props}
    />
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <Circle size={6} bg="brand.subtle" color="brand.fg" fontSize="xs" fontWeight="semibold">
      {n}
    </Circle>
  );
}

export function OpdWaitTimeCalculator() {
  const [month, setMonth] = useState<string>("");
  const [buddhistYear, setBuddhistYear] = useState("25");
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const digit3Ref = useRef<HTMLInputElement>(null);
  const digit4Ref = useRef<HTMLInputElement>(null);

  const isMonthFilled = month !== "";
  const isYearValid = BUDDHIST_YEAR_VALID.test(buddhistYear);
  const canUploadFile1 = isMonthFilled && isYearValid;
  const canUploadFile2 = canUploadFile1 && file1 !== null;

  const canSubmit = isMonthFilled && isYearValid && file1 && file2 && !loading;

  const yearDigit3 = buddhistYear[2] ?? "";
  const yearDigit4 = buddhistYear[3] ?? "";

  function handleYearDigit3Change(e: React.ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    setBuddhistYear(`25${digit}${yearDigit4}`);
    if (digit) digit4Ref.current?.focus();
  }

  function handleYearDigit4Change(e: React.ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    setBuddhistYear(`25${yearDigit3}${digit}`);
  }

  function handleYearDigit4KeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !yearDigit4) {
      digit3Ref.current?.focus();
    }
  }

  function handleYearDigitFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.select();
    e.target.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  async function handleSubmit() {
    setError(null);
    setResult(null);
    setSummary(null);
    setLoading(true);

    try {
      const monthNum = Number(month);
      const gregorianYear = buddhistYearToGregorian(Number(buddhistYear));
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
    <VStack gap={6} align="stretch">
      <GlassCard p={8}>
        <VStack align="stretch" gap={3}>
          <HStack gap={2}>
            <StepBadge n={1} />
            <Text fontWeight="medium">ระบุเดือนและปี</Text>
          </HStack>
          <HStack gap={4} align="start" flexWrap="wrap">
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
              <HStack gap={2}>
                <YearDigitBox value="2" disabled readOnly aria-label="ปี พ.ศ. หลักที่ 1" />
                <YearDigitBox value="5" disabled readOnly aria-label="ปี พ.ศ. หลักที่ 2" />
                <YearDigitBox
                  ref={digit3Ref}
                  value={yearDigit3}
                  onChange={handleYearDigit3Change}
                  onFocus={handleYearDigitFocus}
                  disabled={!isMonthFilled}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  maxLength={1}
                  aria-label="ปี พ.ศ. หลักที่ 3"
                />
                <YearDigitBox
                  ref={digit4Ref}
                  value={yearDigit4}
                  onChange={handleYearDigit4Change}
                  onKeyDown={handleYearDigit4KeyDown}
                  onFocus={handleYearDigitFocus}
                  disabled={!isMonthFilled}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  maxLength={1}
                  aria-label="ปี พ.ศ. หลักที่ 4"
                />
              </HStack>
              <Field.HelperText>รับเฉพาะปี พ.ศ. 4 หลัก รูปแบบ 25xx</Field.HelperText>
            </Field.Root>
          </HStack>
        </VStack>
      </GlassCard>

      <GlassCard p={8}>
        <VStack align="stretch" gap={4}>
          <VStack align="stretch" gap={3} opacity={canUploadFile1 ? 1 : 0.6}>
            <HStack gap={2}>
              <StepBadge n={2} />
              <Text fontWeight="medium">อัปโหลดไฟล์ข้อมูล</Text>
            </HStack>
            <HStack gap={4} align="start" flexWrap="wrap">
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
          <VStack gap={4} align="stretch">
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
