"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  Alert,
  Button,
  Dialog,
  HStack,
  NativeSelect,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FileDown } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { PHYSICIANS } from "@/lib/physicians";
import { THAI_MONTHS } from "../lib/thai-date";

import { exportCastCaseLogPdf } from "../lib/cast-case-log-export";
import {
  deleteCastVisitForAdmin,
  listCastVisitsForAdmin,
  type CastVisitSummary,
} from "../lib/cast-dashboard-actions";
import { CastVisitEditDialog } from "./cast-visit-edit-dialog";
import { CastVisitPersonCard } from "./cast-visit-person-card";

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

export function CastRoomDashboard({ initialVisits }: { initialVisits: CastVisitSummary[] }) {
  const initial = currentMonthYear();
  const [month, setMonth] = useState(String(initial.month));
  const [buddhistYear, setBuddhistYear] = useState(String(initial.year + 543));
  const [doctorFilter, setDoctorFilter] = useState("");
  const [visits, setVisits] = useState(initialVisits);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [editingVisit, setEditingVisit] = useState<CastVisitSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingVisit, setDeletingVisit] = useState<CastVisitSummary | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [swipedVisitId, setSwipedVisitId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();

  const physicianOptions = useMemo(() => {
    const fromVisits = [...new Set(visits.map((v) => v.doctorName).filter(Boolean))];
    const roster = new Set<string>(PHYSICIANS);
    const extras = fromVisits.filter((n) => !roster.has(n)).sort((a, b) => a.localeCompare(b, "th"));
    return [...PHYSICIANS, ...extras];
  }, [visits]);

  const visibleVisits = useMemo(() => {
    if (!doctorFilter) return visits;
    return visits.filter((v) => v.doctorName === doctorFilter);
  }, [visits, doctorFilter]);

  const reload = useCallback(() => {
    const monthNum = Number(month);
    const yearNum = Number(buddhistYear) - 543;
    if (!monthNum || !yearNum) return;

    startTransition(async () => {
      setLoadError(null);
      const result = await listCastVisitsForAdmin(yearNum, monthNum);
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setVisits(result.visits);
    });
  }, [month, buddhistYear]);

  const exportPdf = () => {
    const monthNum = Number(month);
    const yearNum = Number(buddhistYear) - 543;
    if (!monthNum || !yearNum) return;

    startExportTransition(async () => {
      setExportError(null);
      const result = await exportCastCaseLogPdf(
        yearNum,
        monthNum,
        doctorFilter || undefined
      );
      if (!result.ok) {
        setExportError(result.error);
        return;
      }
      downloadBase64Pdf(result.filename, result.pdfBase64);
    });
  };
  const openEdit = (visit: CastVisitSummary) => {
    setSwipedVisitId(null);
    setEditingVisit(visit);
    setDialogOpen(true);
  };

  const openDelete = (visit: CastVisitSummary) => {
    setSwipedVisitId(null);
    setDeletingVisit(visit);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!deletingVisit || isDeleting) return;

    startDeleteTransition(async () => {
      setDeleteError(null);
      const result = await deleteCastVisitForAdmin(deletingVisit.visitId);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      setDeleteDialogOpen(false);
      setDeletingVisit(null);
      reload();
    });
  };

  return (
    <VStack align="stretch" gap={6}>
      <GlassCard variant="solid" p={5}>
        <VStack align="stretch" gap={4}>
          <Text color="fg.muted">เลือกเดือนเพื่อดูรายการที่บันทึกไว้</Text>
          <HStack gap={3} flexWrap="wrap" align="end">
            <NativeSelect.Root flex="1" minW="160px">
              <NativeSelect.Field value={month} onChange={(e) => setMonth(e.target.value)}>
                {THAI_MONTHS.map((name, i) => (
                  <option key={name} value={String(i + 1)}>
                    {name}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>

            <NativeSelect.Root flex="1" minW="120px">
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

            <Button colorPalette="brand" onClick={reload} loading={isPending}>
              แสดงรายการ
            </Button>
          </HStack>

          <HStack gap={3} flexWrap="wrap" align="end">
            <NativeSelect.Root flex="1" minW="200px">
              <NativeSelect.Field
                aria-label="แพทย์"
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
              >
                <option value="">ทุกแพทย์</option>
                {physicianOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>

            <Button
              variant="outline"
              onClick={exportPdf}
              loading={isExporting}
              disabled={isPending}
            >
              <FileDown size={16} />
              ส่งออก PDF
            </Button>
          </HStack>
        </VStack>
      </GlassCard>

      {loadError && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{loadError}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {exportError && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{exportError}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {visibleVisits.length === 0 ? (
        <GlassCard variant="solid" p={8}>
          <Text textAlign="center" color="fg.muted">
            ไม่มีรายการในเดือนที่เลือก
          </Text>
        </GlassCard>
      ) : (
        <VStack align="stretch" gap={3}>
          <Text fontSize="sm" color="fg.muted">
            {visibleVisits.length} รายการ
          </Text>
          {visibleVisits.map((visit) => (
            <CastVisitPersonCard
              key={visit.visitId}
              visit={visit}
              open={swipedVisitId === visit.visitId}
              onOpenChange={(nextOpen) => setSwipedVisitId(nextOpen ? visit.visitId : null)}
              onEdit={() => openEdit(visit)}
              onDelete={() => openDelete(visit)}
            />
          ))}
        </VStack>
      )}

      <CastVisitEditDialog
        visit={editingVisit}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={reload}
      />

      <Dialog.Root
        open={deleteDialogOpen}
        onOpenChange={(e) => {
          setDeleteDialogOpen(e.open);
          if (!e.open) {
            setDeletingVisit(null);
            setDeleteError(null);
          }
        }}
      >
        <Portal>
          <Dialog.Backdrop backdropFilter="blur(4px)" />
          <Dialog.Positioner p={4}>
            <Dialog.Content
              maxW="md"
              w="full"
              bg="glass.solid"
              backdropFilter="blur(16px)"
              borderWidth="1px"
              borderColor="glass.border"
            >
              <Dialog.Header>
                <Dialog.Title>ยืนยันการลบ</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack align="stretch" gap={3}>
                  <Text>
                    ต้องการลบรายการของ{" "}
                    <Text as="span" fontWeight="semibold">
                      {deletingVisit?.patientName}
                    </Text>{" "}
                    (HN {deletingVisit?.hn}) หรือไม่?
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    การลบนี้ไม่สามารถย้อนกลับได้
                  </Text>
                  {deleteError && (
                    <Alert.Root status="error">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{deleteError}</Alert.Description>
                      </Alert.Content>
                    </Alert.Root>
                  )}
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  variant="ghost"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeleting}
                >
                  ยกเลิก
                </Button>
                <Button colorPalette="red" onClick={confirmDelete} loading={isDeleting}>
                  ลบ
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </VStack>
  );
}
