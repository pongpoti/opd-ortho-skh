"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2, Upload } from "lucide-react"
import {
  Button,
  Callout,
  Card,
  Icon,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  TextInput,
  Title,
} from "@tremor/react"

import {
  calculateWaitTimes,
  getLastDayOfMonth,
  parseAndValidateFilePart,
  toMonthKey,
  type CalculationResult,
  type ParsedFile,
} from "@/lib/opd-calculator"
import { siteConfig } from "@/config/site"

const PageIcon = siteConfig.nav.find((item) => item.href === "/waitingtime")!.icon

const MONTHS = [
  { value: "1", label: "มกราคม" },
  { value: "2", label: "กุมภาพันธ์" },
  { value: "3", label: "มีนาคม" },
  { value: "4", label: "เมษายน" },
  { value: "5", label: "พฤษภาคม" },
  { value: "6", label: "มิถุนายน" },
  { value: "7", label: "กรกฎาคม" },
  { value: "8", label: "สิงหาคม" },
  { value: "9", label: "กันยายน" },
  { value: "10", label: "ตุลาคม" },
  { value: "11", label: "พฤศจิกายน" },
  { value: "12", label: "ธันวาคม" },
]

type StatusState = {
  message: string
  type: "error" | "success" | ""
}

type FilePartState =
  | { status: "idle" }
  | { status: "validating"; fileName: string }
  | { status: "valid"; fileName: string; parsed: ParsedFile; range: string }
  | { status: "error"; fileName: string; message: string }

const BUDDHIST_YEAR_PATTERN = /^25\d{2}$/
const BUDDHIST_YEAR_PREFIX_PATTERN = /^(2(5\d{0,2})?)?$/

// Tremor's Callout tints its background via the legacy `bg-opacity-*`
// utility, which Tailwind v4 dropped in favor of the `/opacity` modifier —
// without this override it renders as a solid, fully-opaque block instead
// of a soft tint. tremorTwMerge resolves the conflict in our favor since
// this className is applied after Tremor's own.
const CALLOUT_BG: Record<"emerald" | "red" | "slate", string> = {
  emerald: "bg-emerald-500/10 dark:bg-emerald-500/20",
  red: "bg-red-500/10 dark:bg-red-500/20",
  slate: "bg-slate-500/10 dark:bg-slate-500/20",
}

function hasValidDateSelection(month: string, buddhistYearInput: string) {
  const selectedMonth = Number(month)
  return selectedMonth >= 1 && selectedMonth <= 12 && BUDDHIST_YEAR_PATTERN.test(buddhistYearInput)
}

function FileUploadStep({
  label,
  hint,
  disabled,
  part,
  onFileSelected,
}: {
  label: string
  hint: string
  disabled: boolean
  part: FilePartState
  onFileSelected: (file: File) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <Text className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">{label}</Text>
      <Text>{hint}</Text>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (file) onFileSelected(file)
          }}
        />
        <Button
          type="button"
          variant="secondary"
          icon={Upload}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          เลือกไฟล์
        </Button>
        {part.status !== "idle" ? <Text>{part.fileName}</Text> : null}
      </div>
      {part.status === "validating" ? <Text>กำลังตรวจสอบไฟล์…</Text> : null}
      {part.status === "valid" ? (
        <Callout
          title={`ตรวจสอบผ่าน: ${part.range}`}
          icon={CheckCircle2}
          color="emerald"
          className={CALLOUT_BG.emerald}
        />
      ) : null}
      {part.status === "error" ? (
        <Callout title={part.message} icon={AlertCircle} color="red" className={CALLOUT_BG.red} />
      ) : null}
    </div>
  )
}

export function OpdWaitTimeCalculator() {
  const [month, setMonth] = React.useState("")
  const [buddhistYear, setBuddhistYear] = React.useState("")
  const [firstPart, setFirstPart] = React.useState<FilePartState>({ status: "idle" })
  const [secondPart, setSecondPart] = React.useState<FilePartState>({ status: "idle" })
  const [status, setStatus] = React.useState<StatusState>({ message: "", type: "" })
  const [result, setResult] = React.useState<CalculationResult | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)

  const validDate = hasValidDateSelection(month, buddhistYear)
  const monthKey = validDate ? toMonthKey(Number(buddhistYear), Number(month)) : ""
  const lastDay = monthKey ? getLastDayOfMonth(monthKey) : 31
  const yearFormatError = buddhistYear !== "" && !BUDDHIST_YEAR_PREFIX_PATTERN.test(buddhistYear)

  function resetFileSteps() {
    setFirstPart({ status: "idle" })
    setSecondPart({ status: "idle" })
    setResult(null)
    setStatus({ message: "", type: "" })
  }

  function handleMonthChange(value: string) {
    setMonth(value)
    resetFileSteps()
  }

  function handleYearChange(rawValue: string) {
    const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 4)
    setBuddhistYear(digitsOnly)
    resetFileSteps()
  }

  async function handleFirstFile(file: File) {
    setSecondPart({ status: "idle" })
    setResult(null)
    setStatus({ message: "", type: "" })
    setFirstPart({ status: "validating", fileName: file.name })
    try {
      const text = await file.text()
      const { parsed, range } = parseAndValidateFilePart(text, "ไฟล์ที่ 1", monthKey, 1, 15)
      setFirstPart({ status: "valid", fileName: file.name, parsed, range })
    } catch (error) {
      setFirstPart({
        status: "error",
        fileName: file.name,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async function handleSecondFile(file: File) {
    setResult(null)
    setStatus({ message: "", type: "" })
    setSecondPart({ status: "validating", fileName: file.name })
    try {
      const text = await file.text()
      const { parsed, range } = parseAndValidateFilePart(text, "ไฟล์ที่ 2", monthKey, 16, lastDay)
      setSecondPart({ status: "valid", fileName: file.name, parsed, range })
    } catch (error) {
      setSecondPart({
        status: "error",
        fileName: file.name,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async function handleProcess() {
    if (firstPart.status !== "valid" || secondPart.status !== "valid") return
    setIsProcessing(true)
    setResult(null)
    try {
      const calculation = calculateWaitTimes(
        firstPart.parsed,
        secondPart.parsed,
        firstPart.range,
        secondPart.range
      )
      setResult(calculation)
      setStatus({ message: "ประมวลผลเสร็จสิ้น", type: "success" })
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : String(error), type: "error" })
    } finally {
      setIsProcessing(false)
    }
  }

  const canProcess = firstPart.status === "valid" && secondPart.status === "valid" && !isProcessing

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Icon icon={PageIcon} variant="light" color="blue" size="md" className="bg-blue-500/10 dark:bg-blue-500/20" />
        <Title>ระยะเวลารอคอย</Title>
      </div>

      <Card>
        <Title className="text-tremor-default">1. เลือกเดือนและปี พ.ศ.</Title>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Text className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
              เดือน
            </Text>
            <Select value={month} onValueChange={handleMonthChange} placeholder="เลือกเดือน">
              {MONTHS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Text className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
              ปี พ.ศ.
            </Text>
            <TextInput
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="เช่น 2568"
              value={buddhistYear}
              error={yearFormatError}
              errorMessage="รูปแบบไม่ถูกต้อง"
              onValueChange={handleYearChange}
            />
          </div>
        </div>
      </Card>

      <Card>
        <Title className="text-tremor-default">2. อัปโหลดไฟล์ CSV</Title>
        <div className="mt-4 flex flex-col gap-6">
          <FileUploadStep
            label="ไฟล์ที่ 1 (วันที่ 1–15)"
            hint={
              validDate
                ? "อัปโหลดข้อมูลวันที่ 1 ถึง 15 ของเดือนที่เลือก"
                : "กรุณาเลือกเดือนและปี พ.ศ. ก่อน"
            }
            disabled={!validDate}
            part={firstPart}
            onFileSelected={handleFirstFile}
          />

          <FileUploadStep
            label={`ไฟล์ที่ 2 (วันที่ 16–${lastDay})`}
            hint={
              firstPart.status === "valid"
                ? `อัปโหลดข้อมูลวันที่ 16 ถึง ${lastDay} ของเดือนที่เลือก`
                : "กรุณาอัปโหลดไฟล์ที่ 1 ให้ผ่านการตรวจสอบก่อน"
            }
            disabled={firstPart.status !== "valid"}
            part={secondPart}
            onFileSelected={handleSecondFile}
          />

          <Button type="button" disabled={!canProcess} onClick={handleProcess}>
            {isProcessing ? "กำลังประมวลผล…" : "ประมวลผล"}
          </Button>

          {status.message ? (
            <Callout
              title={status.message}
              icon={status.type === "error" ? AlertCircle : status.type === "success" ? CheckCircle2 : undefined}
              color={status.type === "error" ? "red" : status.type === "success" ? "emerald" : "slate"}
              className={status.type === "error" ? CALLOUT_BG.red : status.type === "success" ? CALLOUT_BG.emerald : CALLOUT_BG.slate}
            />
          ) : null}
        </div>
      </Card>

      {result ? (
        <Card>
          <Title className="text-tremor-default">3. สรุปผลการคำนวณ</Title>
          <Text className="mt-1">{result.detailStatus}</Text>
          <div className="mt-4 flex flex-col gap-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>รายการคำนวณ</TableHeaderCell>
                  <TableHeaderCell>ระยะเวลารอเฉลี่ย</TableHeaderCell>
                  <TableHeaderCell>ระยะเวลารอเฉลี่ย (นาที)</TableHeaderCell>
                  <TableHeaderCell>จำนวนรายการที่ใช้คำนวณ</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.summaryRows.map((row) => (
                  <TableRow key={row.calculation}>
                    <TableCell className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                      {row.calculation}
                    </TableCell>
                    <TableCell>{row.averageDurationText}</TableCell>
                    <TableCell>{row.averageMinutes}</TableCell>
                    <TableCell>{row.recordCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Text>
              <strong className="text-tremor-content-strong dark:text-dark-tremor-content-strong">
                หมายเหตุ:
              </strong>{" "}
              ใช้เฉพาะรายการที่มีเวลา{" "}
              <code className="rounded bg-tremor-background-subtle px-1.5 py-0.5 font-mono text-xs dark:bg-dark-tremor-background-subtle">
                Time
              </code>{" "}
              ตั้งแต่ 06:00:00 ถึง 16:00:00 (รวมเวลาเริ่มต้นและสิ้นสุด)
            </Text>
          </div>
        </Card>
      ) : null}
    </main>
  )
}
