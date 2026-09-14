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
import { calculateWaitTimes, type CalculationResult } from "@/lib/opd-calculator"

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

export function OpdWaitTimeCalculator() {
  const [month, setMonth] = React.useState("")
  const [buddhistYear, setBuddhistYear] = React.useState("")
  const [files, setFiles] = React.useState<File[]>([])
  const [status, setStatus] = React.useState<StatusState>({ message: "", type: "" })
  const [result, setResult] = React.useState<CalculationResult | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const validDate = hasValidDateSelection(month, buddhistYear)
  const canPickFile = validDate
  const canProcess = validDate && files.length > 0 && !isProcessing

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []))
  }

  async function handleProcess() {
    setResult(null)
    setIsProcessing(true)
    try {
      setStatus({ message: "กำลังอ่านไฟล์…", type: "" })
      const sourceFiles = await Promise.all(
        files.map(async (file) => ({ name: file.name, text: await file.text() }))
      )
      const calculation = calculateWaitTimes(sourceFiles, Number(buddhistYear), Number(month))
      setResult(calculation)
      setStatus({ message: "ประมวลผลเสร็จสิ้น", type: "success" })
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : String(error), type: "error" })
    } finally {
      setIsProcessing(false)
    }
  }

  const fileNamesLabel = files.length
    ? "เลือกแล้ว: " + files.map((file) => file.name).join(", ")
    : "ยังไม่ได้เลือกไฟล์"

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
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
          <CardTitle>1. เลือกเดือนและไฟล์</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="grid gap-2">
              <Label htmlFor="month-select">เดือน</Label>
              <Select value={month} onValueChange={setMonth}>
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
                required
                value={buddhistYear}
                onChange={(event) => setBuddhistYear(event.target.value)}
              />
            </div>

            <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
              <Label>ไฟล์ CSV</Label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  multiple
                  required
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canPickFile}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload />
                  เลือกไฟล์ CSV
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{fileNamesLabel}</p>
            </div>

            <Button type="button" disabled={!canProcess} onClick={handleProcess}>
              ประมวลผล
            </Button>
          </div>

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
            <CardTitle>2. สรุปผลการคำนวณ</CardTitle>
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
    </div>
  )
}
