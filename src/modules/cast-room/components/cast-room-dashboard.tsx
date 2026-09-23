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

import { GlassCard } from "@/components/ui/glass-card";
import { THAI_MONTHS } from "../lib/thai-date";

import {
  deleteCastVisitForAdmin,
  listCastVisitsForAdmin,
  type CastVisitSummary,
} from "../lib/cast-dashboard-actions";
import { CastCaseLogExportPanel } from "./cast-case-log-export-panel";
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

export function CastRoomDashboard({ initialVisits }: { initialVisits: CastVisitSummary[] }) {
  const initial = currentMonthYear();
  const [month, setMonth] = useState(String(initial.month));
  const [buddhistYear, setBuddhistYear] = useState(String(initial.year + 543));
  const [listDoctorFilter, setListDoctorFilter] = useState("");
  const [visits, setVisits] = useState(initialVisits);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingVisit, setEditingVisit] = useState<CastVisitSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingVisit, setDeletingVisit] = useState<CastVisitSummary | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [swipedVisitId, setSwipedVisitId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const monthNum = Number(month);
  const yearNum = Number(buddhistYear) - 543;

  const doctorNamesInMonth = useMemo(() => {
    return [...new Set(visits.map((v) => v.doctorName).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "th")
    );
  }, [visits]);

  const visibleVisits = useMemo(() => {
    if (!listDoctorFilter) return visits;
    return visits.filter((v) => v.doctorName === listDoctorFilter);
  }, [visits, listDoctorFilter]);

  const reload = useCallback(() => {
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
  }, [monthNum, yearNum]);

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
          <Text fontWeight="semibold">เดือนที่ต้องการ</Text>
          <Text color="fg.muted" fontSize="sm">
            ใช้ร่วมกันทั้งสร้าง PDF และดูรายการด้านล่าง
          </Text>
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

            <Button colorPalette="brand" onClick={reload} loading={isPending}>
              โหลดรายการ
            </Button>
          </HStack>
        </VStack>
      </GlassCard>

      <CastCaseLogExportPanel month={monthNum} year={yearNum} visits={visits} />

      <GlassCard variant="solid" p={5}>
        <VStack align="stretch" gap={3}>
          <Text fontWeight="semibold">รายการที่บันทึกไว้</Text>
          {doctorNamesInMonth.length > 0 ? (
            <NativeSelect.Root w="full">
              <NativeSelect.Field
                aria-label="กรองแพทย์ในรายการ"
                value={listDoctorFilter}
                onChange={(e) => setListDoctorFilter(e.target.value)}
              >
                <option value="">ทุกแพทย์ในรายการ</option>
                {doctorNamesInMonth.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          ) : (
            <Text fontSize="sm" color="fg.muted">
              กดโหลดรายการเพื่อดูเคสในเดือนนี้
            </Text>
          )}
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
