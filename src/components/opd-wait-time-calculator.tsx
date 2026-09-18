"use client"

import * as React from "react"
import { Upload } from "lucide-react"
import {
  Alert,
  Button,
  Card,
  Code,
  Field,
  Flex,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Table,
  Text,
} from "@chakra-ui/react"

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

function hasValidDateSelection(month: string, buddhistYearInput: string) {
  const selectedMonth = Number(month)
  return selectedMonth >= 1 && selectedMonth <= 12 && BUDDHIST_YEAR_PATTERN.test(buddhistYearInput)
}

function StepNumber({ children }: { children: React.ReactNode }) {
  return (
    <Flex
      boxSize="6"
      flexShrink="0"
      align="center"
      justify="center"
      borderRadius="full"
      bg="brand.solid"
      color="brand.contrast"
      fontSize="xs"
      fontWeight="semibold"
    >
      {children}
    </Flex>
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
    <Flex direction="column" gap="2" borderWidth="1px" borderRadius="lg" bg="bg.muted/30" p="4">
      <Text fontWeight="medium">{label}</Text>
      <Text fontSize="sm" color="fg.muted">
        {hint}
      </Text>
      <HStack mt="1" wrap="wrap" gap="3">
        <Input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          disabled={disabled}
          srOnly
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (file) onFileSelected(file)
          }}
        />
        <Button type="button" variant="outline" disabled={disabled} onClick={() => inputRef.current?.click()}>
          <Upload size={16} />
          เลือกไฟล์
        </Button>
        {part.status !== "idle" ? (
          <Text minW="0" truncate fontSize="sm" color="fg.muted">
            {part.fileName}
          </Text>
        ) : null}
      </HStack>
      {part.status === "validating" ? (
        <Text fontSize="sm" color="fg.muted">
          กำลังตรวจสอบไฟล์…
        </Text>
      ) : null}
      {part.status === "valid" ? (
        <Alert.Root status="success">
          <Alert.Indicator />
          <Alert.Description>ตรวจสอบผ่าน: {part.range}</Alert.Description>
        </Alert.Root>
      ) : null}
      {part.status === "error" ? (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Description>{part.message}</Alert.Description>
        </Alert.Root>
      ) : null}
    </Flex>
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
    <Flex as="main" mx="auto" w="full" maxW="5xl" flex="1" direction="column" gap="6" px={{ base: "4", sm: "6" }} py="8">
      <HStack gap="3">
        <Flex boxSize="10" flexShrink="0" align="center" justify="center" borderRadius="lg" bg="brand.muted" color="brand.fg">
          <PageIcon size={20} aria-hidden="true" />
        </Flex>
        <Heading size={{ base: "lg", sm: "xl" }}>ระยะเวลารอคอย</Heading>
      </HStack>

      <Card.Root>
        <Card.Header>
          <Card.Title display="flex" alignItems="center" gap="2.5">
            <StepNumber>1</StepNumber>
            เลือกเดือนและปี พ.ศ.
          </Card.Title>
        </Card.Header>
        <Card.Body display="grid" gap="4" gridTemplateColumns={{ base: "1fr", sm: "1fr 1fr" }}>
          <Field.Root>
            <Field.Label>เดือน</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={month}
                onChange={(event) => handleMonthChange(event.target.value)}
                placeholder="เลือกเดือน"
              >
                {MONTHS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root invalid={yearFormatError}>
            <Field.Label>ปี พ.ศ.</Field.Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="25[0-9]{2}"
              maxLength={4}
              placeholder="เช่น 2568"
              value={buddhistYear}
              onChange={(event) => handleYearChange(event.target.value)}
            />
            {yearFormatError ? <Field.ErrorText>รูปแบบไม่ถูกต้อง</Field.ErrorText> : null}
          </Field.Root>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title display="flex" alignItems="center" gap="2.5">
            <StepNumber>2</StepNumber>
            อัปโหลดไฟล์ CSV
          </Card.Title>
        </Card.Header>
        <Card.Body display="flex" flexDir="column" gap="4">
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

          <Button type="button" size="lg" disabled={!canProcess} loading={isProcessing} loadingText="กำลังประมวลผล…" onClick={handleProcess}>
            ประมวลผล
          </Button>

          {status.message ? (
            <Alert.Root status={status.type === "error" ? "error" : status.type === "success" ? "success" : "info"}>
              <Alert.Indicator />
              <Alert.Description>{status.message}</Alert.Description>
            </Alert.Root>
          ) : null}
        </Card.Body>
      </Card.Root>

      {result ? (
        <Card.Root>
          <Card.Header>
            <Card.Title display="flex" alignItems="center" gap="2.5">
              <StepNumber>3</StepNumber>
              สรุปผลการคำนวณ
            </Card.Title>
            <Card.Description>{result.detailStatus}</Card.Description>
          </Card.Header>
          <Card.Body display="flex" flexDir="column" gap="4">
            <Table.ScrollArea borderWidth="1px" borderRadius="lg">
              <Table.Root>
                <Table.Header>
                  <Table.Row bg="bg.muted/50">
                    <Table.ColumnHeader>รายการคำนวณ</Table.ColumnHeader>
                    <Table.ColumnHeader>ระยะเวลารอเฉลี่ย</Table.ColumnHeader>
                    <Table.ColumnHeader>ระยะเวลารอเฉลี่ย (นาที)</Table.ColumnHeader>
                    <Table.ColumnHeader>จำนวนรายการที่ใช้คำนวณ</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {result.summaryRows.map((row) => (
                    <Table.Row key={row.calculation}>
                      <Table.Cell fontWeight="medium">{row.calculation}</Table.Cell>
                      <Table.Cell>{row.averageDurationText}</Table.Cell>
                      <Table.Cell>{row.averageMinutes}</Table.Cell>
                      <Table.Cell>{row.recordCount}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
            <Text fontSize="sm" color="fg.muted">
              <Text as="strong" fontWeight="medium" color="fg">
                หมายเหตุ:
              </Text>{" "}
              ใช้เฉพาะรายการที่มีเวลา <Code fontSize="xs">Time</Code> ตั้งแต่ 06:00:00 ถึง 16:00:00
              (รวมเวลาเริ่มต้นและสิ้นสุด)
            </Text>
          </Card.Body>
        </Card.Root>
      ) : null}
    </Flex>
  )
}
