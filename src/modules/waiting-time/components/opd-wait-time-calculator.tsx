"use client";

import { useState } from "react";
import { Clock, ClipboardList } from "lucide-react";

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

function isValidPartialBuddhistYear(value: string): boolean {
  if (!/^\d{0,4}$/.test(value)) return false;
  if (value.length >= 1 && value[0] !== "2") return false;
  if (value.length >= 2 && value[1] !== "5") return false;
  return true;
}

export function OpdWaitTimeCalculator() {
  const [month, setMonth] = useState<string>("");
  const [buddhistYear, setBuddhistYear] = useState("");
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isMonthFilled = month !== "";
  const isYearValid = BUDDHIST_YEAR_VALID.test(buddhistYear);
  const canUploadFile1 = isMonthFilled && isYearValid;
  const canUploadFile2 = canUploadFile1 && file1 !== null;

  const canSubmit = isMonthFilled && isYearValid && file1 && file2 && !loading;

  function handleYearChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    if (isValidPartialBuddhistYear(next)) {
      setBuddhistYear(next);
    }
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
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <div>
            <h2 className="card-title">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Clock className="size-4" />
              </span>
              เครื่องคำนวณระยะเวลารอคอย
            </h2>
            <p className="text-base-content/70">
              อัปโหลดไฟล์ CSV ทั้งสองไฟล์ (ครึ่งเดือนแรกและครึ่งเดือนหลัง) เพื่อคำนวณระยะเวลารอคอยเฉลี่ยของผู้ป่วยนอก
              ทุกอย่างประมวลผลในเบราว์เซอร์ของคุณ — ไม่มีการอัปโหลดหรือจัดเก็บข้อมูลใด ๆ
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
              <h3 className="font-medium">ระบุเดือนและปี</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">เดือน</span>
                </div>
                <select
                  className="select select-bordered w-full"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                >
                  <option value="" disabled>
                    เลือกเดือน
                  </option>
                  {MONTHS.map((name, i) => (
                    <option key={name} value={String(i + 1)}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">ปี (พ.ศ.)</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="25[0-9]{2}"
                  maxLength={4}
                  placeholder="เช่น 2568"
                  className="input input-bordered w-full disabled:cursor-not-allowed disabled:opacity-50"
                  value={buddhistYear}
                  onChange={handleYearChange}
                  disabled={!isMonthFilled}
                />
                <div className="label">
                  <span className="label-text-alt text-base-content/60">
                    รับเฉพาะปี พ.ศ. 4 หลัก รูปแบบ 25xx
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="divider my-0" />

          <div className={`flex flex-col gap-3 ${canUploadFile1 ? "" : "opacity-60"}`}>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              <h3 className="font-medium">อัปโหลดไฟล์ข้อมูล</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">ไฟล์ที่ 1 (วันที่ 1–15)</span>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  className="file-input file-input-bordered w-full disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={(e) => setFile1(e.target.files?.[0] ?? null)}
                  disabled={!canUploadFile1}
                />
              </label>

              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">ไฟล์ที่ 2 (วันที่ 16–สิ้นเดือน)</span>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  className="file-input file-input-bordered w-full disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={(e) => setFile2(e.target.files?.[0] ?? null)}
                  disabled={!canUploadFile2}
                />
              </label>
            </div>
          </div>

          <button
            className="btn btn-primary w-fit"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? "กำลังคำนวณ…" : "คำนวณ"}
          </button>

          {error && (
            <div role="alert" className="alert alert-error">
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <div>
              <h2 className="card-title">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ClipboardList className="size-4" />
                </span>
                ผลลัพธ์
              </h2>
              {summary && <p className="text-base-content/70">{summary}</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="bg-primary/5 text-primary">
                  <tr>
                    <th>กลุ่ม</th>
                    <th>ค่าเฉลี่ย (ชม:นาที:วินาที)</th>
                    <th>ค่าเฉลี่ย (นาที)</th>
                    <th>จำนวนรายการ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>โดยรวม</td>
                    <td>{result.all.durationHms}</td>
                    <td>{result.all.durationMinutes}</td>
                    <td>{result.all.count}</td>
                  </tr>
                  <tr>
                    <td>แพทย์ประจำ</td>
                    <td>{result.staff.durationHms}</td>
                    <td>{result.staff.durationMinutes}</td>
                    <td>{result.staff.count}</td>
                  </tr>
                  <tr>
                    <td>แพทย์หมุนเวียน</td>
                    <td>{result.nonStaff.durationHms}</td>
                    <td>{result.nonStaff.durationMinutes}</td>
                    <td>{result.nonStaff.count}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
