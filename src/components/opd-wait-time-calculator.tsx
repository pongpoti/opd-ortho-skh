"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2, Upload } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  calculateWaitTimes,
  getLastDayOfMonth,
  parseAndValidateFilePart,
  toMonthKey,
  type CalculationResult,
  type ParsedFile,
} from "@/lib/opd-calculator"

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

function hasValidDateSelection(month: string, buddhistYearInput: string) {
  const buddhistYear = Number(buddhistYearInput)
  const selectedMonth = Number(month)
  return (
    selectedMonth >= 1 &&
    selectedMonth <= 12 &&
    Number.isInteger(buddhistYear) &&
    buddhistYear >= 2500 &&
    buddhistYear <= 2700
  )
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
    <div className="grid gap-2">
      <Label>{label}</Label>
      <p className="text-sm text-muted-foreground">{hint}</p>
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
          variant="outline"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Upload />
          เลือกไฟล์
        </Button>
        {part.status !== "idle" ? (
          <span className="text-sm text-muted-foreground">{part.fileName}</span>
        ) : null}
      </div>
      {part.status === "validating" ? (
        <p className="text-sm text-muted-foreground">กำลังตรวจสอบไฟล์…</p>
      ) : null}
      {part.status === "valid" ? (
        <Alert variant="success">
          <CheckCircle2 />
          <AlertDescription>ตรวจสอบผ่าน: {part.range}</AlertDescription>
        </Alert>
      ) : null}
      {part.status === "error" ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{part.message}</AlertDescription>
        </Alert>
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

  function handleYearChange(value: string) {
    setBuddhistYear(value)
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          เวลารอคอย OPD ORTHO รพ. สค.
        </h1>
        <p className="mt-1 text-muted-foreground">
          กรุณาเลือกเดือน และอัปโหลดไฟล์ CSV ของเดือนนั้น
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. เลือกเดือนและปี พ.ศ.</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="month-select">เดือน</Label>
            <Select value={month} onValueChange={handleMonthChange}>
              <SelectTrigger id="month-select" className="w-full">
                <SelectValue placeholder="เลือกเดือน" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="buddhist-year">ปี พ.ศ.</Label>
            <Input
              id="buddhist-year"
              type="number"
              inputMode="numeric"
              min={2500}
              max={2700}
              value={buddhistYear}
              onChange={(event) => handleYearChange(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. อัปโหลดไฟล์ CSV</CardTitle>
          <CardDescription>
            อัปโหลดทีละไฟล์ตามลำดับ ระบบจะตรวจสอบวันที่ในไฟล์ก่อนให้อัปโหลดไฟล์ถัดไป
            (ตั้งชื่อไฟล์อะไรก็ได้ ระบบตรวจสอบจากข้อมูลวันที่ในไฟล์)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
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
            <Alert
              variant={status.type === "error" ? "destructive" : status.type === "success" ? "success" : "default"}
              role="alert"
            >
              {status.type === "error" ? <AlertCircle /> : status.type === "success" ? <CheckCircle2 /> : null}
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>3. สรุปผลการคำนวณ</CardTitle>
            <CardDescription>{result.detailStatus}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รายการคำนวณ</TableHead>
                    <TableHead>ระยะเวลารอเฉลี่ย</TableHead>
                    <TableHead>ระยะเวลารอเฉลี่ย (นาที)</TableHead>
                    <TableHead>จำนวนรายการที่ใช้คำนวณ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.summaryRows.map((row) => (
                    <TableRow key={row.calculation}>
                      <TableCell className="font-medium">{row.calculation}</TableCell>
                      <TableCell>{row.averageDurationText}</TableCell>
                      <TableCell>{row.averageMinutes}</TableCell>
                      <TableCell>{row.recordCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">หมายเหตุ:</strong> ใช้เฉพาะรายการที่มีเวลา{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Time</code> ตั้งแต่
              06:00:00 ถึง 16:00:00 (รวมเวลาเริ่มต้นและสิ้นสุด)
            </p>
          </CardContent>
        </Card>
      ) : null}
    </main>
  )
}
