"use client";

import { useCallback, useState, useTransition } from "react";
import {
  Alert,
  Badge,
  Button,
  HStack,
  NativeSelect,
  Text,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import { Pencil } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { THAI_MONTHS } from "../lib/thai-date";

import {
  listCastVisitsForAdmin,
  type CastVisitSummary,
} from "../lib/cast-dashboard-actions";
import { formatThaiDate } from "../lib/thai-date";
import { CastVisitEditDialog } from "./cast-visit-edit-dialog";

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
  const [isPending, startTransition] = useTransition();

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
    setEditingVisit(visit);
    setDialogOpen(true);
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
            <GlassCard key={visit.visitId} variant="solid" p={5}>
              <VStack align="stretch" gap={3}>
                <HStack justify="space-between" align="start" gap={3}>
                  <VStack align="start" gap={1} flex="1">
                    <Text fontWeight="semibold">{formatThaiDate(visit.shiftDate)}</Text>
                    <Text fontSize="sm" color="fg.muted">
                      {visit.doctorName}
                    </Text>
                    <HStack gap={2} fontSize="sm" flexWrap="wrap">
                      <Text fontFamily="mono">HN {visit.hn}</Text>
                      <Text>·</Text>
                      <Text fontWeight="medium">{visit.patientName}</Text>
                    </HStack>
                    <Text fontSize="sm" color="fg.muted">
                      {visit.diagnosis}
                    </Text>
                    {visit.loggedByName && (
                      <Text fontSize="xs" color="fg.muted">
                        บันทึกโดย {visit.loggedByName}
                      </Text>
                    )}
                  </VStack>
                  <Button size="sm" variant="outline" colorPalette="brand" onClick={() => openEdit(visit)}>
                    <Pencil size={16} />
                    แก้ไข
                  </Button>
                </HStack>
                <Wrap gap={2}>
                  {visit.casts.map((cast) => (
                    <Badge key={cast.id} colorPalette="brand" variant="subtle" borderRadius="full">
                      {cast.label}
                      {cast.count > 1 ? ` ×${cast.count}` : ""}
                    </Badge>
                  ))}
                </Wrap>
              </VStack>
            </GlassCard>
          ))}
        </VStack>
      )}

      <CastVisitEditDialog
        visit={editingVisit}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={reload}
      />
    </VStack>
  );
}
