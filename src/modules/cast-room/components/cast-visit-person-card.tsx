"use client";

import { useId, useRef, useState } from "react";
import { Badge, Box, Button, Flex, Text, VStack, Wrap } from "@chakra-ui/react";
import { Pencil, Trash2 } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";

import type { CastVisitSummary } from "../lib/cast-dashboard-actions";
import { formatThaiDate } from "../lib/thai-date";

/** Per-action column width — matches common iOS/Android swipe action gutters. */
const ACTION_WIDTH = 76;
const ACTIONS_TOTAL = ACTION_WIDTH * 2;
const OPEN_THRESHOLD = 40;
const CLOSE_THRESHOLD = 28;

type CastVisitPersonCardProps = {
  visit: CastVisitSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function CastVisitPersonCard({
  visit,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: CastVisitPersonCardProps) {
  const hintId = useId();
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: number;
    locked: "h" | "v" | null;
    moved: boolean;
  } | null>(null);

  const resting = open ? -ACTIONS_TOTAL : 0;
  const translateX = dragOffset ?? resting;
  const dragging = dragOffset !== null;
  /** Any reveal: square the content’s trailing edge so it sits flush on actions. */
  const revealing = translateX < -0.5;

  const clamp = (value: number) => Math.min(0, Math.max(-ACTIONS_TOTAL, value));

  const endDrag = (clientX: number) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.locked === "v") {
      setDragOffset(null);
      return;
    }

    const next = clamp(drag.origin + (clientX - drag.startX));
    const shouldOpen = open ? next < -CLOSE_THRESHOLD : next < -OPEN_THRESHOLD;
    onOpenChange(shouldOpen);
    setDragOffset(null);
  };

  return (
    <Box
      position="relative"
      borderRadius="2xl"
      overflow="hidden"
      isolation="isolate"
      touchAction="pan-y"
    >
      {/* Action rail — full-height columns behind content (universal swipe pattern). */}
      <Flex
        position="absolute"
        insetY={0}
        right={0}
        w={`${ACTIONS_TOTAL}px`}
        zIndex={0}
        aria-hidden={!open}
      >
        <Button
          unstyled
          flex="1"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={1}
          bg="brand.solid"
          color="brand.contrast"
          cursor="pointer"
          borderRadius={0}
          height="100%"
          onClick={() => {
            onOpenChange(false);
            onEdit();
          }}
          aria-label="แก้ไข"
          tabIndex={open ? 0 : -1}
          _active={{ opacity: 0.9 }}
        >
          <Pencil size={18} aria-hidden />
          <Text fontSize="xs" fontWeight="semibold">
            แก้ไข
          </Text>
        </Button>
        <Button
          unstyled
          flex="1"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={1}
          bg="red.solid"
          color="red.contrast"
          cursor="pointer"
          borderRadius={0}
          height="100%"
          onClick={() => {
            onOpenChange(false);
            onDelete();
          }}
          aria-label="ลบ"
          tabIndex={open ? 0 : -1}
          _active={{ opacity: 0.9 }}
        >
          <Trash2 size={18} aria-hidden />
          <Text fontSize="xs" fontWeight="semibold">
            ลบ
          </Text>
        </Button>
      </Flex>

      <GlassCard
        variant="solid"
        p={5}
        position="relative"
        zIndex={1}
        borderRadius="2xl"
        /* Square the trailing edge while revealed so white box meets actions seamlessly. */
        borderRightRadius={revealing ? 0 : undefined}
        borderRightWidth={revealing ? 0 : undefined}
        boxShadow={revealing ? "none" : undefined}
        transform={`translate3d(${translateX}px, 0, 0)`}
        transition={dragging ? "none" : "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)"}
        willChange="transform"
        userSelect="none"
        style={{ WebkitUserSelect: "none" }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          dragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            origin: resting,
            locked: null,
            moved: false,
          };
          setDragOffset(resting);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== e.pointerId) return;

          const dx = e.clientX - drag.startX;
          const dy = e.clientY - drag.startY;

          if (!drag.locked) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            drag.locked = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
            if (drag.locked === "v") return;
          }
          if (drag.locked === "v") return;

          drag.moved = true;
          e.preventDefault();
          setDragOffset(clamp(drag.origin + dx));
        }}
        onPointerUp={(e) => {
          if (dragRef.current?.pointerId !== e.pointerId) return;
          const drag = dragRef.current;
          // Tap content while open closes actions (standard list swipe UX).
          if (open && drag && !drag.moved && drag.locked !== "h") {
            dragRef.current = null;
            setDragOffset(null);
            onOpenChange(false);
            return;
          }
          endDrag(e.clientX);
        }}
        onPointerCancel={(e) => {
          if (dragRef.current?.pointerId !== e.pointerId) return;
          endDrag(e.clientX);
        }}
        role="group"
        aria-describedby={hintId}
      >
        <Text
          id={hintId}
          position="absolute"
          width="1px"
          height="1px"
          padding={0}
          margin="-1px"
          overflow="hidden"
          clip="rect(0, 0, 0, 0)"
          whiteSpace="nowrap"
          borderWidth={0}
        >
          ปัดซ้ายเพื่อแก้ไขหรือลบ
        </Text>
        <VStack align="stretch" gap={3}>
          <VStack align="start" gap={1}>
            <Text fontWeight="semibold">{formatThaiDate(visit.shiftDate)}</Text>
            <Text fontSize="sm" color="fg.muted">
              {visit.doctorName}
            </Text>
            <Box display="flex" gap={2} fontSize="sm" flexWrap="wrap">
              <Text fontFamily="mono">HN {visit.hn}</Text>
              <Text>·</Text>
              <Text fontWeight="medium">{visit.patientName}</Text>
            </Box>
            <Text fontSize="sm" color="fg.muted">
              {visit.diagnosis}
            </Text>
            {visit.loggedByName && (
              <Text fontSize="xs" color="fg.muted">
                บันทึกโดย {visit.loggedByName}
              </Text>
            )}
          </VStack>
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
    </Box>
  );
}
