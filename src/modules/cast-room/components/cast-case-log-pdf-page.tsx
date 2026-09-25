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
import { FileDown } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { ensureLiffInit, liff } from "@/lib/liff-client";
import { PHYSICIANS } from "@/lib/physicians";

import { CAST_CASE_LOG_PAY_PER_CASE } from "../lib/cast-case-log-constants";
import { createCastCaseLogPdfLink } from "../lib/cast-case-log-export";
import { estimateCastCaseLogPageCount } from "../lib/cast-case-log-layout";
import { listCastVisitsForAdmin, seedPongsitAugust2026Dummy, type CastVisitSummary } from "../lib/cast-dashboard-actions";
import { recentMonthOptions } from "../lib/thai-date";

/** Open the signed HTTPS PDF URL — blob downloads fail silently in LINE WebView. */
async function openPdfUrl(url: string) {
  try {
    await ensureLiffInit();
    if (liff.isInClient()) {
      liff.openWindow({ url, external: true });
      return;
    }
  } catch {
    // Outside LIFF or init failed — fall through to browser open.
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.assign(url);
  }
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

  const doctorVisits = useMemo(() => {
    if (!doctorName) return [];
    return visits.filter((v) => v.doctorName === doctorName);
  }, [visits, doctorName]);

  const caseCount = doctorVisits.length;
  const pageCount = estimateCastCaseLogPageCount(doctorVisits);
  const payTotal = caseCount * CAST_CASE_LOG_PAY_PER_CASE;
  const monthHasLogs = visits.length > 0;
  const canExport = Boolean(doctorName) && monthHasLogs && caseCount > 0;

  const busy = isPending || isDownloading || isSeeding;
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
      const result = await createCastCaseLogPdfLink(yearNum, monthNum, doctorName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await openPdfUrl(result.pdfUrl);
      setSuccess(
        `เปิด PDF แล้ว · ${result.caseCount} รายการ · รวม ${result.caseCount * CAST_CASE_LOG_PAY_PER_CASE} บาท`
      );
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
              แล้วเปิดดู PDF
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
              onClick={download}
              loading={isDownloading}
              disabled={busy || !canExport}
            >
              <FileDown size={16} />
              ดาวน์โหลด PDF
            </Button>
            {!doctorName && monthHasLogs && (
              <Text fontSize="xs" color="fg.muted">
                เลือกแพทย์ก่อนดาวน์โหลด PDF
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
