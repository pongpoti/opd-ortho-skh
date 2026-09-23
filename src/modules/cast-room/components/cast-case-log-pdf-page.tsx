"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  Alert,
  Button,
  HStack,
  NativeSelect,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FileDown, MessageCircle } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { ensureLiffInit, liff } from "@/lib/liff-client";
import { PHYSICIANS } from "@/lib/physicians";

import {
  CAST_CASE_LOG_PAY_PER_CASE,
  CAST_CASE_LOG_ROWS_PER_PAGE,
} from "../lib/cast-case-log-constants";
import {
  createCastCaseLogShareLink,
  exportCastCaseLogPdf,
} from "../lib/cast-case-log-export";
import { listCastVisitsForAdmin, type CastVisitSummary } from "../lib/cast-dashboard-actions";
import { THAI_MONTHS } from "../lib/thai-date";

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function buddhistYearOptions() {
  const { year } = currentMonthYear();
  return [year + 543, year + 543 - 1];
}

function downloadBase64Pdf(filename: string, base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CastCaseLogPdfPage({ initialVisits }: { initialVisits: CastVisitSummary[] }) {
  const initial = currentMonthYear();
  const [month, setMonth] = useState(String(initial.month));
  const [buddhistYear, setBuddhistYear] = useState(String(initial.year + 543));
  const [doctorName, setDoctorName] = useState("");
  const [visits, setVisits] = useState(initialVisits);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startLoad] = useTransition();
  const [isDownloading, startDownload] = useTransition();
  const [isSharing, startShare] = useTransition();

  const monthNum = Number(month);
  const yearNum = Number(buddhistYear) - 543;

  const physicianOptions = useMemo(() => {
    const fromVisits = [...new Set(visits.map((v) => v.doctorName).filter(Boolean))];
    const roster = new Set<string>(PHYSICIANS);
    const extras = fromVisits
      .filter((n) => !roster.has(n))
      .sort((a, b) => a.localeCompare(b, "th"));
    return [...PHYSICIANS, ...extras];
  }, [visits]);

  const caseCount = useMemo(() => {
    if (!doctorName) return visits.length;
    return visits.filter((v) => v.doctorName === doctorName).length;
  }, [visits, doctorName]);

  const pageCount =
    caseCount <= 0 ? 1 : Math.ceil(caseCount / CAST_CASE_LOG_ROWS_PER_PAGE);
  const payTotal = caseCount * CAST_CASE_LOG_PAY_PER_CASE;

  const busy = isPending || isDownloading || isSharing;

  const reload = useCallback(() => {
    if (!monthNum || !yearNum) return;
    startLoad(async () => {
      setLoadError(null);
      const result = await listCastVisitsForAdmin(yearNum, monthNum);
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setVisits(result.visits);
    });
  }, [monthNum, yearNum]);

  const download = () => {
    startDownload(async () => {
      setError(null);
      setSuccess(null);
      const result = await exportCastCaseLogPdf(yearNum, monthNum, doctorName || undefined);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      downloadBase64Pdf(result.filename, result.pdfBase64);
      setSuccess(
        `ดาวน์โหลดแล้ว · ${result.caseCount} รายการ · รวม ${result.caseCount * CAST_CASE_LOG_PAY_PER_CASE} บาท`
      );
    });
  };

  const shareToChat = () => {
    if (!doctorName) {
      setError("กรุณาเลือกแพทย์ก่อนส่งในแชท");
      return;
    }

    startShare(async () => {
      setError(null);
      setSuccess(null);

      const result = await createCastCaseLogShareLink(yearNum, monthNum, doctorName);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      try {
        await ensureLiffInit();
        if (!liff.isApiAvailable("shareTargetPicker")) {
          await navigator.clipboard.writeText(result.chatText);
          setSuccess("คัดลอกลิงก์ PDF แล้ว — วางในแชท LINE ได้เลย");
          return;
        }

        const shared = await liff.shareTargetPicker([
          { type: "text", text: result.chatText },
        ]);

        if (shared) {
          setSuccess(`ส่งลิงก์ PDF ไปยังแชทแล้ว · ${result.caseCount} รายการ`);
        }
      } catch {
        try {
          await navigator.clipboard.writeText(result.chatText);
          setSuccess("คัดลอกลิงก์ PDF แล้ว — วางในแชท LINE ได้เลย");
        } catch {
          setError("ส่งในแชทไม่สำเร็จ กรุณาดาวน์โหลดแทน");
        }
      }
    });
  };

  return (
    <VStack align="stretch" gap={6}>
      <GlassCard variant="solid" p={5}>
        <VStack align="stretch" gap={4}>
          <VStack align="stretch" gap={1}>
            <Text fontWeight="semibold" fontSize="lg">
              สร้างบันทึก PDF
            </Text>
            <Text color="fg.muted" fontSize="sm">
              เลือกเดือนและแพทย์ แล้วดาวน์โหลดหรือส่งไฟล์เข้าแชท LINE
            </Text>
          </VStack>

          <HStack gap={3} flexWrap="wrap" align="end">
            <NativeSelect.Root flex="1" minW="140px">
              <NativeSelect.Field value={month} onChange={(e) => setMonth(e.target.value)}>
                {THAI_MONTHS.map((name, i) => (
                  <option key={name} value={String(i + 1)}>
                    {name}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>

            <NativeSelect.Root flex="1" minW="110px">
              <NativeSelect.Field
                aria-label="ปี พ.ศ."
                value={buddhistYear}
                onChange={(e) => setBuddhistYear(e.target.value)}
              >
                {buddhistYearOptions().map((be) => (
                  <option key={be} value={String(be)}>
                    {be}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>

            <Button colorPalette="brand" onClick={reload} loading={isPending} disabled={busy}>
              โหลดรายการ
            </Button>
          </HStack>

          <NativeSelect.Root w="full">
            <NativeSelect.Field
              aria-label="แพทย์"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
            >
              <option value="">ทุกแพทย์ (ดาวน์โหลดรวม)</option>
              {physicianOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>

          <HStack
            justify="space-between"
            flexWrap="wrap"
            gap={2}
            px={3}
            py={2}
            borderRadius="lg"
            bg="brand.subtle"
          >
            <Text fontSize="sm" color="fg.muted">
              {doctorName ? doctorName : "ทุกแพทย์ที่มีรายการ"}
            </Text>
            <Text fontSize="sm" fontWeight="medium">
              {caseCount} รายการ · {pageCount} หน้า · รวม {payTotal} บาท
              <Text as="span" color="fg.muted" fontWeight="normal">
                {" "}
                (รายการละ {CAST_CASE_LOG_PAY_PER_CASE})
              </Text>
            </Text>
          </HStack>

          <VStack align="stretch" gap={2}>
            <Button
              colorPalette="brand"
              onClick={shareToChat}
              loading={isSharing}
              disabled={busy || !doctorName}
            >
              <MessageCircle size={16} />
              ส่งในแชท LINE
            </Button>
            <Button variant="outline" onClick={download} loading={isDownloading} disabled={busy}>
              <FileDown size={16} />
              ดาวน์โหลด PDF
            </Button>
            {!doctorName && (
              <Text fontSize="xs" color="fg.muted">
                เลือกแพทย์เพื่อส่งในแชท — ดาวน์โหลดรวมทุกแพทย์ได้ทันที
              </Text>
            )}
          </VStack>

          {loadError && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{loadError}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}
          {error && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}
          {success && (
            <Alert.Root status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{success}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}
        </VStack>
      </GlassCard>
    </VStack>
  );
}
