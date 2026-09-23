"use client";

import { useMemo, useState, useTransition } from "react";
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
  createCastCaseLogShareLink,
  exportCastCaseLogPdf,
} from "../lib/cast-case-log-export";
import { CAST_CASE_LOG_ROWS_PER_PAGE } from "../lib/cast-case-log-constants";
import type { CastVisitSummary } from "../lib/cast-dashboard-actions";

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

type Props = {
  month: number;
  year: number; // Gregorian
  visits: CastVisitSummary[];
};

export function CastCaseLogExportPanel({ month, year, visits }: Props) {
  const [doctorName, setDoctorName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDownloading, startDownload] = useTransition();
  const [isSharing, startShare] = useTransition();

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

  const busy = isDownloading || isSharing;

  const download = () => {
    startDownload(async () => {
      setError(null);
      setSuccess(null);
      const result = await exportCastCaseLogPdf(year, month, doctorName || undefined);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      downloadBase64Pdf(result.filename, result.pdfBase64);
      setSuccess(
        `ดาวน์โหลดแล้ว · ${result.caseCount} รายการ · ${result.pageCount} หน้า`
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

      const result = await createCastCaseLogShareLink(year, month, doctorName);
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
    <GlassCard variant="solid" p={5}>
      <VStack align="stretch" gap={4}>
        <VStack align="stretch" gap={1}>
          <Text fontWeight="semibold" fontSize="lg">
            สร้างบันทึก PDF
          </Text>
          <Text color="fg.muted" fontSize="sm">
            ใช้เดือนด้านบน เลือกแพทย์ แล้วดาวน์โหลดหรือส่งไฟล์เข้าแชท LINE
          </Text>
        </VStack>

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
            {caseCount} รายการ · {pageCount} หน้า
            <Text as="span" color="fg.muted" fontWeight="normal">
              {" "}
              (หน้าละ {CAST_CASE_LOG_ROWS_PER_PAGE})
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
          <Button
            variant="outline"
            onClick={download}
            loading={isDownloading}
            disabled={busy}
          >
            <FileDown size={16} />
            ดาวน์โหลด PDF
          </Button>
          {!doctorName && (
            <Text fontSize="xs" color="fg.muted">
              เลือกแพทย์เพื่อส่งในแชท — ดาวน์โหลดรวมทุกแพทย์ได้ทันที
            </Text>
          )}
        </VStack>

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
  );
}
