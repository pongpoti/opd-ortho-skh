"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>เครื่องคำนวณระยะเวลารอคอย</CardTitle>
          <CardDescription>
            อัปโหลดไฟล์ CSV ทั้งสองไฟล์ (ครึ่งเดือนแรกและครึ่งเดือนหลัง) เพื่อคำนวณระยะเวลารอคอยเฉลี่ยของผู้ป่วยนอก
            ทุกอย่างประมวลผลในเบราว์เซอร์ของคุณ — ไม่มีการอัปโหลดหรือจัดเก็บข้อมูลใด ๆ
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="month">เดือน</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="month" className="w-full">
                  <SelectValue placeholder="เลือกเดือน" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((name, i) => (
                    <SelectItem key={name} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="year">ปี (พ.ศ.)</Label>
              <Input
                id="year"
                inputMode="numeric"
                placeholder="เช่น 2568"
                value={buddhistYear}
                onChange={(e) => setBuddhistYear(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="file1">ไฟล์ที่ 1 (วันที่ 1–15)</Label>
              <Input
                id="file1"
                type="file"
                accept=".csv"
                onChange={(e) => setFile1(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="file2">ไฟล์ที่ 2 (วันที่ 16–สิ้นเดือน)</Label>
              <Input
                id="file2"
                type="file"
                accept=".csv"
                onChange={(e) => setFile2(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-fit">
            {loading ? "กำลังคำนวณ…" : "คำนวณ"}
          </Button>

          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>ผลลัพธ์</CardTitle>
            {summary && <CardDescription>{summary}</CardDescription>}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>กลุ่ม</TableHead>
                  <TableHead>ค่าเฉลี่ย (ชม:นาที:วินาที)</TableHead>
                  <TableHead>ค่าเฉลี่ย (นาที)</TableHead>
                  <TableHead>จำนวนรายการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>โดยรวม</TableCell>
                  <TableCell>{result.all.durationHms}</TableCell>
                  <TableCell>{result.all.durationMinutes}</TableCell>
                  <TableCell>{result.all.count}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>แพทย์ประจำ</TableCell>
                  <TableCell>{result.staff.durationHms}</TableCell>
                  <TableCell>{result.staff.durationMinutes}</TableCell>
                  <TableCell>{result.staff.count}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>แพทย์หมุนเวียน</TableCell>
                  <TableCell>{result.nonStaff.durationHms}</TableCell>
                  <TableCell>{result.nonStaff.durationMinutes}</TableCell>
                  <TableCell>{result.nonStaff.count}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
