"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Box, HStack, IconButton, Text, VStack } from "@chakra-ui/react";
import { Pencil, PhoneCall } from "lucide-react";

import { parseDutyPersonName } from "../lib/duty-data";
import {
  loadSecondCallDay,
  type SecondCallDayView,
  type SecondCallSubDutyView,
} from "../lib/second-call-actions";
import { SUB_DUTY_LABELS, subDutyWhen } from "../lib/second-call-labels";
import { SecondCallEditSheet } from "./second-call-edit-sheet";

type SecondCallDaySectionProps = {
  year: number;
  month: number;
  day: number;
  isAdmin: boolean;
  /** Bumped after a roster edit so the section reloads. */
  refreshKey: number;
};

/** Second-call for the selected day's duty, editable by admins. */
export function SecondCallDaySection({ year, month, day, isAdmin, refreshKey }: SecondCallDaySectionProps) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "ready"; view: SecondCallDayView | null } | { status: "error"; error: string }
  >({ status: "loading" });
  const [editShift, setEditShift] = useState<SecondCallSubDutyView["shift"] | null>(null);
  const [, startLoad] = useTransition();
  const latest = useRef(0);

  const reload = useCallback(() => {
    const request = ++latest.current;
    startLoad(async () => {
      setState({ status: "loading" });
      try {
        const result = await loadSecondCallDay(year, month, day);
        if (latest.current !== request) return;
        setState(result.ok ? { status: "ready", view: result.view } : { status: "error", error: result.error });
      } catch {
        if (latest.current !== request) return;
        setState({ status: "error", error: "โหลด second-call ไม่สำเร็จ" });
      }
    });
  }, [year, month, day]);

  useEffect(() => {
    reload();
    return () => { latest.current += 1; };
  }, [reload, refreshKey]);

  const view = state.status === "ready" ? state.view : null;
  if (state.status === "ready" && !view) return null;
  const editing = view?.subDuties.find((sub) => sub.shift === editShift);

  return (
    <Box borderTopWidth="1px" borderColor="glass.border" pt={4} mt={1}>
      <HStack gap={3} mb={2}>
        <Box color="brand.fg" flexShrink={0}>
          <PhoneCall size={20} />
        </Box>
        <Text fontSize="md" lineHeight="1.5" fontWeight="medium" color="fg.muted">
          Second-call
        </Text>
      </HStack>
      {state.status !== "ready" && (
        <Text fontSize="sm" color={state.status === "error" ? "holiday.fg" : "fg.muted"} pl={8} py={2}
          role={state.status === "error" ? "alert" : "status"}>
          {state.status === "error" ? state.error : "กำลังโหลด…"}
        </Text>
      )}
      {view && <SecondCallDayList view={view} day={day} isAdmin={isAdmin} onEdit={setEditShift} />}

      {editing && view?.staff && (
        <SecondCallEditSheet
          open={!!editing}
          onOpenChange={(open) => { if (!open) setEditShift(null); }}
          year={year}
          month={month}
          day={day}
          subDuty={editing}
          staff={view.staff}
          minPerStaff={view.minPerStaff}
          onSaved={reload}
        />
      )}
    </Box>
  );
}

/** The day's sub-duties and their second-call doctors. */
export function SecondCallDayList({ view, day, isAdmin, onEdit }: {
  view: SecondCallDayView;
  /** Duty day the sub-duties belong to. */
  day: number;
  isAdmin: boolean;
  onEdit: (shift: SecondCallSubDutyView["shift"]) => void;
}) {
  return (
    <VStack align="stretch" gap={0} pl={8}>
      {view.subDuties.map((sub) => (
        <HStack key={sub.shift} gap={3} py={2.5}>
          <Box
            w="30px" h="30px" borderRadius="md" flexShrink={0}
            display="flex" alignItems="center" justifyContent="center"
            bg="brand.subtle" color="brand.fg" fontWeight="bold" fontSize="sm"
          >
            {sub.shift}
          </Box>
          <VStack align="start" gap={0} flex="1" minW={0}>
            <Text fontSize="xs" color="fg.muted">
              {SUB_DUTY_LABELS[sub.shift].name} {subDutyWhen(sub, day)}
            </Text>
            <HStack gap={2} flexWrap="wrap">
              <Text fontSize="lg" fontWeight="semibold" lineHeight="1.5" color={sub.names.length ? "fg" : "fg.muted"}>
                {sub.names.length ? sub.names.map((name) => parseDutyPersonName(name).first).join(" · ") : "-"}
              </Text>
              {sub.pinned && (
                <Text as="span" fontSize="10px" fontWeight="bold" color="brand.fg" bg="brand.subtle" px={2} py={0.5} borderRadius="full">
                  แอดมินกำหนด
                </Text>
              )}
            </HStack>
          </VStack>
          {isAdmin && view.staff && (
            <IconButton
              aria-label={`แก้ไข second-call ${SUB_DUTY_LABELS[sub.shift].name}`}
              size="sm"
              variant="ghost"
              flexShrink={0}
              onClick={() => onEdit(sub.shift)}
            >
              <Pencil size={16} />
            </IconButton>
          )}
        </HStack>
      ))}
    </VStack>
  );
}
