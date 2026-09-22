"use client";

import { Button, Grid, HStack, IconButton, Text, VStack } from "@chakra-ui/react";
import { Minus, Plus } from "lucide-react";

import { CAST_TYPES } from "../lib/cast-types";
import { CastIcon } from "../lib/cast-icons";

const MAX_CAST_COUNT = 20;

type CastTypePickerProps = {
  value: Map<string, number>;
  onChange: (next: Map<string, number>) => void;
};

function setCount(map: Map<string, number>, id: string, count: number): Map<string, number> {
  const next = new Map(map);
  const clamped = Math.min(Math.max(count, 0), MAX_CAST_COUNT);
  if (clamped > 0) next.set(id, clamped);
  else next.delete(id);
  return next;
}

export function CastTypePicker({ value, onChange }: CastTypePickerProps) {
  const toggle = (id: string) => {
    onChange(setCount(value, id, value.has(id) ? 0 : 1));
  };

  const adjust = (id: string, delta: number) => {
    onChange(setCount(value, id, (value.get(id) ?? 0) + delta));
  };

  return (
    <Grid templateColumns={{ base: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" }} gap={3}>
      {CAST_TYPES.map((t) => {
        const count = value.get(t.id) ?? 0;
        const active = count > 0;

        return (
          <Button
            key={t.id}
            type="button"
            variant="outline"
            colorPalette="brand"
            onClick={() => toggle(t.id)}
            aria-pressed={active}
            aria-label={`${t.label}${active ? ` จำนวน ${count}` : ""}`}
            borderWidth="2px"
            borderColor={active ? "brand.solid" : "border"}
            bg={active ? "brand.subtle" : "bg"}
            borderRadius="2xl"
            p={3}
            minH="12rem"
            h="auto"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="flex-start"
            gap={2}
            transition="border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease"
            boxShadow={active ? "sm" : "none"}
            _hover={{ borderColor: active ? "brand.solid" : "brand.muted", bg: active ? "brand.subtle" : "bg.subtle" }}
          >
            <VStack gap={1.5} flex="1" justify="center" pointerEvents="none" w="full">
              <Text as="span" color={active ? "brand.fg" : "fg"} lineHeight={0}>
                <CastIcon id={t.id} size={96} />
              </Text>
              <Text
                fontSize="md"
                fontWeight={active ? "semibold" : "medium"}
                textAlign="center"
                lineHeight="short"
                whiteSpace="normal"
              >
                {t.label}
              </Text>
            </VStack>

            {active && (
              <HStack
                gap={0}
                borderWidth="1px"
                borderColor="brand.muted"
                borderRadius="full"
                bg="bg"
                px={1}
                onClick={(e) => e.stopPropagation()}
              >
                <IconButton
                  aria-label={`ลดจำนวน ${t.label}`}
                  size="sm"
                  variant="ghost"
                  colorPalette="brand"
                  disabled={count === 0}
                  onClick={() => adjust(t.id, -1)}
                >
                  <Minus size={16} />
                </IconButton>
                <Text minW="7" textAlign="center" fontSize="md" fontWeight="bold">
                  {count}
                </Text>
                <IconButton
                  aria-label={`เพิ่มจำนวน ${t.label}`}
                  size="sm"
                  variant="ghost"
                  colorPalette="brand"
                  disabled={count >= MAX_CAST_COUNT}
                  onClick={() => adjust(t.id, 1)}
                >
                  <Plus size={16} />
                </IconButton>
              </HStack>
            )}
          </Button>
        );
      })}
    </Grid>
  );
}
