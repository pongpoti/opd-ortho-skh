export const STAFF_NAMES = [
  "เฉลิมพล กินรี",
  "ชวพล กิตตินภดล",
  "ชัยวัฒน์ ล้อพงศ์ไพบูลย์",
  "เทพรักษา เหมพรหมราช",
  "ธนกร วงศ์สล้างกุล",
  "ธีรฉัตต์ ธนะสารสมบูรณ์",
  "ปราการ ชุมภูปัน",
  "ปองสิทธิ์ โพธิคุณ",
  "ปิติพงศ์ จู่ภิบาล",
  "พลสันต์ สันธนพิพัฒน์กุล",
  "วรงค์พร พงศ์ภิญโญภาพ",
  "วันทนันท์ หล่อวัฒนากิจชัย",
  "วิฑูรย์ กิตติพิชัย",
  "สิทธิพงศ์ เกตุวงศ์วิริยะ",
  "โอภาส ไชยมหาพฤกษ์",
].map(normalize)

export const REQUIRED_COLUMNS = [
  "Date",
  "Time",
  "ส่งตรวจที่แผนก",
  "พบแพทย์ที่แผนก",
  "ระยะเวลารอ",
  "แพทย์",
] as const

export const CLINIC = "ห้องตรวจศัลยกรรมกระดูก"
export const EXCLUDED_DEPARTMENTS = ["วัดบางปลา", "วัดเกตุม"]

export type CsvRow = Record<string, string>

export interface ParsedFile {
  name: string
  headers: string[]
  rows: CsvRow[]
}

export interface SummaryRow {
  calculation: string
  averageDurationText: string
  averageMinutes: string
  recordCount: number
}

export interface CalculationResult {
  summaryRows: SummaryRow[]
  detailStatus: string
}

export function normalize(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""))
      if (row.some((cell) => cell !== "")) rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }

  if (quoted) throw new Error("ไฟล์ CSV มีเครื่องหมายอัญประกาศเปิดค้างอยู่")
  if (field !== "" || row.length) {
    row.push(field.replace(/\r$/, ""))
    if (row.some((cell) => cell !== "")) rows.push(row)
  }

  return rows
}

export function parseFile(text: string, fileName: string): ParsedFile {
  const matrix = parseCsv(text)
  if (matrix.length < 2) throw new Error(fileName + " ไม่มีแถวข้อมูล")

  const headers = matrix[0].map((header, index) =>
    index === 0 ? header.replace(/^﻿/, "") : header
  )
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column))
  if (missing.length) {
    throw new Error(fileName + " ไม่มีคอลัมน์: " + missing.join(", "))
  }

  const rows = matrix.slice(1).map((cells, index) => {
    if (cells.length !== headers.length) {
      throw new Error(
        fileName +
          " แถวที่ " +
          (index + 2) +
          " มี " +
          cells.length +
          " คอลัมน์ แต่ควรมี " +
          headers.length +
          " คอลัมน์"
      )
    }
    return Object.fromEntries(
      headers.map((header, cellIndex) => [header, cells[cellIndex]])
    ) as CsvRow
  })

  return { name: fileName, headers, rows }
}

export function timeSeconds(value: unknown): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.exec(normalize(value))
  if (!match) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

export function isStaff(doctor: unknown): boolean {
  const person = normalize(doctor)
  return STAFF_NAMES.some((name) => person.includes(name))
}

export function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds)
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const secs = rounded % 60
  return [hours, minutes, secs]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
}

export function dateText(month: string, day: number): string {
  return month + "-" + String(day).padStart(2, "0")
}

export function validateFileDates(
  rows: CsvRow[],
  fileName: string,
  month: string,
  startDay: number,
  endDay: number
): string {
  const datePattern = new RegExp("^" + month.replace("-", "\\-") + "-(\\d{2})$")
  const dates = new Set<string>()

  for (const row of rows) {
    const value = normalize(row.Date)
    const match = datePattern.exec(value)
    if (!match) {
      throw new Error(fileName + " มีค่า Date ที่ไม่ใช่เดือน " + month + ": " + value)
    }
    const day = Number(match[1])
    if (day < startDay || day > endDay) {
      throw new Error(fileName + " มีค่า Date นอกช่วงที่กำหนด: " + value)
    }
    dates.add(value)
  }

  const expected: string[] = []
  for (let day = startDay; day <= endDay; day += 1) expected.push(dateText(month, day))
  const missing = expected.filter((date) => !dates.has(date))
  if (missing.length) {
    throw new Error(fileName + " ไม่มีข้อมูลวันที่: " + missing.join(", "))
  }

  return dateText(month, startDay) + " ถึง " + dateText(month, endDay)
}

function makeSummary(label: string, group: CsvRow[]): SummaryRow {
  const waits = group.map((row) => waitSeconds(row["ระยะเวลารอ"]) as number)
  const avg = average(waits)
  return {
    calculation: label,
    averageDurationText: formatDuration(avg),
    averageMinutes: (avg / 60).toFixed(2),
    recordCount: group.length,
  }
}

function waitSeconds(value: unknown): number | null {
  return timeSeconds(value)
}

export interface SourceFile {
  name: string
  text: string
}

export function calculateWaitTimes(
  files: SourceFile[],
  buddhistYear: number,
  selectedMonth: number
): CalculationResult {
  if (
    !Number.isInteger(buddhistYear) ||
    buddhistYear < 2500 ||
    buddhistYear > 2700 ||
    !selectedMonth
  ) {
    throw new Error("กรุณาเลือกเดือนและกรอกปี พ.ศ. ให้ถูกต้อง")
  }
  if (files.length !== 2) {
    throw new Error("กรุณาเลือกไฟล์ CSV จำนวน 2 ไฟล์เท่านั้น")
  }
  if (files.some((file) => !file.name.endsWith(".csv"))) {
    throw new Error("ไฟล์ทั้งสองต้องมีนามสกุล .csv")
  }
  const selectedNames = files.map((file) => file.name).sort()
  if (selectedNames.join("|") !== "1.csv|2.csv") {
    throw new Error("ชื่อไฟล์ต้องเป็น 1.csv และ 2.csv เท่านั้น")
  }

  const gregorianYear = buddhistYear - 543
  const month = String(gregorianYear) + "-" + String(selectedMonth).padStart(2, "0")

  const parsed = files.map((file) => parseFile(file.text, file.name))
  const headers = parsed[0].headers
  if (parsed.some((file) => file.headers.join("|") !== headers.join("|"))) {
    throw new Error("ไฟล์ CSV ทุกไฟล์ต้องมีคอลัมน์และลำดับคอลัมน์เดียวกัน")
  }

  const firstFile = parsed.find((file) => file.name === "1.csv")
  const secondFile = parsed.find((file) => file.name === "2.csv")
  if (!firstFile || !secondFile) {
    throw new Error("ไม่พบไฟล์ 1.csv หรือ 2.csv")
  }

  const [year, monthNumber] = month.split("-").map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()

  const firstRange = validateFileDates(firstFile.rows, "1.csv", month, 1, 15)
  const secondRange = validateFileDates(secondFile.rows, "2.csv", month, 16, lastDay)
  const precheck =
    "ตรวจสอบเบื้องต้นผ่าน: 1.csv (" + firstRange + ") และ 2.csv (" + secondRange + ")"

  const sourceRows = parsed.flatMap((file) => file.rows)
  const wrongMonth = sourceRows.filter((row) => !normalize(row.Date).startsWith(month + "-"))
  if (wrongMonth.length) {
    throw new Error(
      "พบข้อมูล " + wrongMonth.length + " รายการที่อยู่นอกเดือน " + month + " กรุณาเลือกเดือนหรือไฟล์ให้ถูกต้อง"
    )
  }

  const filteredByClinic = sourceRows.filter((row) => normalize(row["พบแพทย์ที่แผนก"]) === CLINIC)
  const afterDepartmentExclusions = filteredByClinic.filter(
    (row) => !EXCLUDED_DEPARTMENTS.some((keyword) => normalize(row["ส่งตรวจที่แผนก"]).includes(keyword))
  )
  const afterTime = afterDepartmentExclusions.filter((row) => {
    const value = timeSeconds(row.Time)
    return value !== null && value >= 21600 && value <= 57600
  })
  const validRows = afterTime.filter((row) => waitSeconds(row["ระยะเวลารอ"]) !== null)

  validRows.sort((a, b) => (a.Date + " " + a.Time).localeCompare(b.Date + " " + b.Time))

  const staff = validRows.filter((row) => isStaff(row["แพทย์"]))
  const nonstaff = validRows.filter((row) => !isStaff(row["แพทย์"]))

  if (!validRows.length) throw new Error("ไม่พบข้อมูลที่เหลือหลังการกรอง")
  if (!staff.length || !nonstaff.length) {
    throw new Error("ไม่พบข้อมูลในกลุ่มบุคลากรหรือกลุ่มไม่ใช่บุคลากรหลังการกรอง")
  }

  const summaryRows: SummaryRow[] = [
    makeSummary("ค่าเฉลี่ยรวม", validRows),
    makeSummary("ค่าเฉลี่ยกลุ่มบุคลากร", staff),
    makeSummary("ค่าเฉลี่ยกลุ่มไม่ใช่บุคลากร", nonstaff),
  ]

  const removedInvalid = afterTime.length - validRows.length
  const detailStatus =
    precheck +
    " ใช้ข้อมูล " +
    validRows.length +
    " รายการ จากข้อมูลต้นทาง " +
    sourceRows.length +
    " รายการ" +
    (removedInvalid ? " โดยไม่นำข้อมูลที่มีระยะเวลารอไม่ถูกต้อง " + removedInvalid + " รายการมาคำนวณ" : "")

  return { summaryRows, detailStatus }
}
