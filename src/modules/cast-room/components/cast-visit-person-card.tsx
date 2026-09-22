"use client";

import { useId, useRef, useState } from "react";
import { Badge, Box, Button, Flex, Text, VStack, Wrap } from "@chakra-ui/react";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";

import type { CastVisitSummary } from "../lib/cast-dashboard-actions";
import { formatThaiDate } from "../lib/thai-date";

const ACTION_WIDTH = 92;
const OPEN_THRESHOLD = 48;
const CLOSE_THRESHOLD = 32;

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
  } | null>(null);

  const resting = open ? -ACTION_WIDTH : 0;
  const translateX = dragOffset ?? resting;
  const dragging = dragOffset !== null;

  const clamp = (value: number) => Math.min(0, Math.max(-ACTION_WIDTH, value));

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
      <Flex
        position="absolute"
        insetY={0}
        right={0}
        w={`${ACTION_WIDTH}px`}
        direction="column"
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
          borderTopRightRadius="2xl"
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
          borderBottomRightRadius="2xl"
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

          e.preventDefault();
          setDragOffset(clamp(drag.origin + dx));
        }}
        onPointerUp={(e) => {
          if (dragRef.current?.pointerId !== e.pointerId) return;
          endDrag(e.clientX);
        }}
        onPointerCancel={(e) => {
          if (dragRef.current?.pointerId !== e.pointerId) return;
          endDrag(e.clientX);
        }}
        role="group"
        aria-describedby={hintId}
      >
        <Flex gap={3} align="stretch">
          <VStack align="stretch" gap={3} flex="1" minW={0}>
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

          <Button
            unstyled
            aria-label={open ? "ปิดเมนูแก้ไข" : "ปัดซ้ายเพื่อแก้ไขหรือลบ"}
            aria-expanded={open}
            aria-describedby={hintId}
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(!open);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            display="flex"
            alignItems="center"
            justifyContent="center"
            alignSelf="center"
            flexShrink={0}
            w="28px"
            h="64px"
            borderRadius="full"
            bg="bg.muted"
            color="fg.muted"
            cursor="pointer"
            _hover={{ color: "fg" }}
            css={{
              "@keyframes swipeHintPulse": {
                "0%, 100%": { transform: "translateX(0)", opacity: 0.55 },
                "50%": { transform: "translateX(-3px)", opacity: 1 },
              },
            }}
          >
            <Box
              id={hintId}
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap={0}
              animation={open ? undefined : "swipeHintPulse 1.6s ease-in-out infinite"}
              aria-hidden
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
              <ChevronLeft size={14} strokeWidth={2.5} style={{ marginTop: -6 }} />
            </Box>
          </Button>
        </Flex>
      </GlassCard>
    </Box>
  );
}
