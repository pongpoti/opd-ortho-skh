"use client";

import { useCallback, useState, useTransition } from "react";
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

      {visits.length === 0 ? (
        <GlassCard variant="solid" p={8}>
          <Text textAlign="center" color="fg.muted">
            ไม่มีรายการในเดือนที่เลือก
          </Text>
        </GlassCard>
      ) : (
        <VStack align="stretch" gap={3}>
          <Text fontSize="sm" color="fg.muted">
            {visits.length} รายการ
          </Text>
          {visits.map((visit) => (
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
