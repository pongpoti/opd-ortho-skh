"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  NativeSelect,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";

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

export function OpdWaitTimeCalculator() {
  const [month, setMonth] = useState<string>("");
  const [buddhistYear, setBuddhistYear] = useState("");
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = month !== "" && buddhistYear !== "" && file1 && file2 && !loading;

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

      const [text1, text2] = await Promise.all([
        file1!.text(),
        file2!.text(),
      ]);

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
    <Stack gap="6">
      <Card.Root>
        <Card.Body>
          <Stack gap="4">
            <Stack gap="1">
              <Card.Title>เครื่องคำนวณระยะเวลารอคอย</Card.Title>
              <Card.Description>
                อัปโหลดไฟล์ CSV ทั้งสองไฟล์ (ครึ่งเดือนแรกและครึ่งเดือนหลัง)
                เพื่อคำนวณระยะเวลารอคอยเฉลี่ยของผู้ป่วยนอก
                ทุกอย่างประมวลผลในเบราว์เซอร์ของคุณ — ไม่มีการอัปโหลดหรือจัดเก็บข้อมูลใด ๆ
              </Card.Description>
            </Stack>

            <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4">
              <Field.Root>
                <Field.Label>เดือน</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    placeholder="เลือกเดือน"
                  >
                    {MONTHS.map((name, i) => (
                      <option key={name} value={String(i + 1)}>
                        {name}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>

              <Field.Root>
                <Field.Label>ปี (พ.ศ.)</Field.Label>
                <Input
                  inputMode="numeric"
                  placeholder="เช่น 2568"
                  value={buddhistYear}
                  onChange={(e) => setBuddhistYear(e.target.value)}
                />
              </Field.Root>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4">
              <Field.Root>
                <Field.Label>ไฟล์ที่ 1 (วันที่ 1–15)</Field.Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile1(e.target.files?.[0] ?? null)}
                  p="1"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>ไฟล์ที่ 2 (วันที่ 16–สิ้นเดือน)</Field.Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile2(e.target.files?.[0] ?? null)}
                  p="1"
                />
              </Field.Root>
            </SimpleGrid>

            <Button onClick={handleSubmit} disabled={!canSubmit} alignSelf="flex-start">
              {loading ? "กำลังคำนวณ…" : "คำนวณ"}
            </Button>

            {error && (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Title>{error}</Alert.Title>
              </Alert.Root>
            )}
          </Stack>
        </Card.Body>
      </Card.Root>

      {result && (
        <Card.Root>
          <Card.Body>
            <Stack gap="4">
              <Stack gap="1">
                <Card.Title>ผลลัพธ์</Card.Title>
                {summary && <Text color="fg.muted">{summary}</Text>}
              </Stack>
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>กลุ่ม</Table.ColumnHeader>
                    <Table.ColumnHeader>ค่าเฉลี่ย (ชม:นาที:วินาที)</Table.ColumnHeader>
                    <Table.ColumnHeader>ค่าเฉลี่ย (นาที)</Table.ColumnHeader>
                    <Table.ColumnHeader>จำนวนรายการ</Table.ColumnHeader>
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
            </Stack>
          </Card.Body>
        </Card.Root>
      )}
    </Stack>
  );
}
