"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { listCastVisitsForAdmin, seedPongsitAugust2026Dummy, type CastVisitSummary } from "../lib/cast-dashboard-actions";
import { recentMonthOptions } from "../lib/thai-date";

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

function parseMonthValue(value: string): { year: number; month: number } | null {
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) return null;
  return { year: y, month: m };
}

export function CastCaseLogPdfPage({
  initialVisits,
  initialEmptyError = null,
}: {
  initialVisits: CastVisitSummary[];
  initialEmptyError?: string | null;
}) {
  const monthOptions = useMemo(() => recentMonthOptions(6), []);
  const [monthValue, setMonthValue] = useState(monthOptions[0]?.value ?? "");
  const [doctorName, setDoctorName] = useState("");
  const [visits, setVisits] = useState(initialVisits);
  const [loadError, setLoadError] = useState<string | null>(initialEmptyError);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startLoad] = useTransition();
  const [isDownloading, startDownload] = useTransition();
  const [isSharing, startShare] = useTransition();
  const [isSeeding, startSeed] = useTransition();
  /** Skip the first effect run — SSR already loaded the default month. */
  const skipNextMonthLoad = useRef(true);

  const selected = parseMonthValue(monthValue);
  const monthNum = selected?.month ?? 0;
  const yearNum = selected?.year ?? 0;

  const physicianOptions = useMemo(() => {
    const withVisits = new Set(visits.map((v) => v.doctorName).filter(Boolean));
    const fromRoster = PHYSICIANS.filter((name) => withVisits.has(name));
    const roster = new Set<string>(PHYSICIANS);
    const extras = [...withVisits]
      .filter((name) => !roster.has(name))
      .sort((a, b) => a.localeCompare(b, "th"));
    return [...fromRoster, ...extras];
  }, [visits]);

  const caseCount = useMemo(() => {
    if (!doctorName) return 0;
    return visits.filter((v) => v.doctorName === doctorName).length;
  }, [visits, doctorName]);

  const pageCount =
    caseCount <= 0 ? 1 : Math.ceil(caseCount / CAST_CASE_LOG_ROWS_PER_PAGE);
  const payTotal = caseCount * CAST_CASE_LOG_PAY_PER_CASE;
  const monthHasLogs = visits.length > 0;
  const canExport = Boolean(doctorName) && monthHasLogs && caseCount > 0;

  const busy = isPending || isDownloading || isSharing || isSeeding;
  const canSeedAugustDummy = yearNum === 2026 && monthNum === 8;

  const reload = useCallback((year: number, month: number) => {
    if (!month || !year) return;
    startLoad(async () => {
      setLoadError(null);
      setError(null);
      setSuccess(null);
      const result = await listCastVisitsForAdmin(year, month);
      if (!result.ok) {
        setVisits([]);
        setLoadError(result.error);
        return;
      }
      setVisits(result.visits);
      if (result.visits.length === 0) {
        setLoadError("ไม่มีรายการในเดือนที่เลือก");
      }
    });
  }, []);

  useEffect(() => {
    if (skipNextMonthLoad.current) {
      skipNextMonthLoad.current = false;
      return;
    }
    reload(yearNum, monthNum);
  }, [monthValue, monthNum, yearNum, reload]);

  const onMonthChange = (value: string) => {
    setMonthValue(value);
    setDoctorName("");
    setError(null);
    setSuccess(null);
  };

  const download = () => {
    if (!doctorName) {
      setError("กรุณาเลือกแพทย์ก่อนดาวน์โหลด");
      return;
    }
    if (!monthHasLogs) {
      setError("ไม่มีรายการในเดือนที่เลือก");
      return;
    }
    if (caseCount === 0) {
      setError("ไม่มีรายการของแพทย์นี้ในเดือนที่เลือก");
      return;
    }

    startDownload(async () => {
      setError(null);
      setSuccess(null);
      const result = await exportCastCaseLogPdf(yearNum, monthNum, doctorName);
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
    if (!monthHasLogs) {
      setError("ไม่มีรายการในเดือนที่เลือก");
      return;
    }
    if (caseCount === 0) {
      setError("ไม่มีรายการของแพทย์นี้ในเดือนที่เลือก");
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

        // shareTargetPicker cannot attach PDF files; send a Flex card with a
        // URI button that opens the signed PDF link (works inside LINE).
        const altText = [
          `บันทึกห้องเฝือก · ${result.monthLabel}`,
          `${result.doctorName} · ${result.caseCount} รายการ`,
          result.shareUrl,
        ].join("\n");

        let shared: { status: string } | undefined | void;
        try {
          shared = await liff.shareTargetPicker([
            {
              type: "flex",
              altText,
              contents: {
                type: "bubble",
                size: "kilo",
                body: {
                  type: "box",
                  layout: "vertical",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "บันทึกห้องเฝือก",
                      weight: "bold",
                      size: "md",
                      wrap: true,
                    },
                    {
                      type: "text",
                      text: `${result.monthLabel} · ${result.doctorName}`,
                      size: "sm",
                      color: "#666666",
                      wrap: true,
                    },
                    {
                      type: "text",
                      text: `${result.caseCount} รายการ · รวม ${result.caseCount * CAST_CASE_LOG_PAY_PER_CASE} บาท`,
                      size: "sm",
                      wrap: true,
                    },
                  ],
                },
                footer: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "button",
                      style: "primary",
                      color: "#0F766E",
                      action: {
                        type: "uri",
                        label: "เปิด PDF",
                        uri: result.shareUrl,
                      },
                    },
                  ],
                },
              },
            },
          ]);
        } catch {
          // Some channels only allow text via shareTargetPicker — fall back.
          shared = await liff.shareTargetPicker([
            { type: "text", text: result.chatText },
          ]);
        }

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

  const seedAugustDummy = () => {
    if (!canSeedAugustDummy) return;
    startSeed(async () => {
      setError(null);
      setLoadError(null);
      const result = await seedPongsitAugust2026Dummy();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const listed = await listCastVisitsForAdmin(2026, 8);
      if (!listed.ok) {
        setVisits([]);
        setLoadError(listed.error);
        return;
      }
      setVisits(listed.visits);
      setDoctorName("ปองสิทธิ์ โพธิคุณ");
      setSuccess(`ใส่ข้อมูลทดสอบแล้ว · ${result.visitCount} วัน (1–31 ส.ค. 2569)`);
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
              เลือกเดือน (ย้อนหลัง 6 เดือน นับจากเดือนก่อนหน้า ไม่รวมเดือนปัจจุบัน) และแพทย์
              แล้วดาวน์โหลด PDF หรือส่งลิงก์เข้าแชท LINE
            </Text>
          </VStack>

          <NativeSelect.Root w="full" disabled={busy}>
            <NativeSelect.Field
              aria-label="เดือน"
              value={monthValue}
              onChange={(e) => onMonthChange(e.target.value)}
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>

          <NativeSelect.Root w="full" disabled={busy || !monthHasLogs}>
            <NativeSelect.Field
              aria-label="แพทย์"
              value={doctorName}
              onChange={(e) => {
                setDoctorName(e.target.value);
                setError(null);
                setSuccess(null);
              }}
            >
              <option value="" disabled>
                เลือกแพทย์
              </option>
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
              {isPending
                ? "กำลังโหลด…"
                : doctorName
                  ? doctorName
                  : "ยังไม่ได้เลือกแพทย์"}
            </Text>
            <Text fontSize="sm" fontWeight="medium">
              {doctorName
                ? `${caseCount} รายการ · ${pageCount} หน้า · รวม ${payTotal} บาท`
                : "—"}
              {doctorName && (
                <Text as="span" color="fg.muted" fontWeight="normal">
                  {" "}
                  (รายการละ {CAST_CASE_LOG_PAY_PER_CASE})
                </Text>
              )}
            </Text>
          </HStack>

          <VStack align="stretch" gap={2}>
            <Button
              colorPalette="brand"
              onClick={shareToChat}
              loading={isSharing}
              disabled={busy || !canExport}
            >
              <MessageCircle size={16} />
              ส่งในแชท LINE
            </Button>
            <Button
              variant="outline"
              onClick={download}
              loading={isDownloading}
              disabled={busy || !canExport}
            >
              <FileDown size={16} />
              ดาวน์โหลด PDF
            </Button>
            {!doctorName && monthHasLogs && (
              <Text fontSize="xs" color="fg.muted">
                เลือกแพทย์ก่อนดาวน์โหลดหรือส่งในแชท LINE
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
          {canSeedAugustDummy && (
            <Button
              variant="ghost"
              size="sm"
              onClick={seedAugustDummy}
              loading={isSeeding}
              disabled={busy}
              alignSelf="flex-start"
            >
              ใส่ข้อมูลทดสอบ ปองสิทธิ์ ส.ค. 2569 (วันละ 1 รายการ)
            </Button>
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
