"use client";

import { useRef, useEffect, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { HStack, Input } from "@chakra-ui/react";

/**
 * HnInput — HN as seven single-digit boxes, OTP-style, ported from
 * castroom's src/components/HnInput.tsx (HN at this hospital is always
 * exactly 7 digits).
 */
export const HN_LEN = 7;

export interface HnInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  describedBy?: string;
}

export function HnInput({ value, onChange, ariaLabel = "HN", describedBy }: HnInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: HN_LEN }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (value.length > HN_LEN) onChange(value.slice(0, HN_LEN));
  }, [value, onChange]);

  const setDigit = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join(""));
  };

  const handleChange = (i: number, e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (raw && !digit) return;
    setDigit(i, digit);
    if (digit && i < HN_LEN - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      setDigit(i - 1, "");
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < HN_LEN - 1) {
      e.preventDefault();
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, HN_LEN);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, HN_LEN - 1)]?.focus();
  };

  return (
    <HStack gap={1.5} role="group" aria-label={ariaLabel}>
      {digits.map((d, i) => (
        <Input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          textAlign="center"
          fontFamily="mono"
          fontWeight="bold"
          fontSize="18px"
          px={0}
          h={12}
          minW={0}
          flex="1"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={1}
          value={d}
          aria-label={`${ariaLabel} หลักที่ ${i + 1} จาก ${HN_LEN}`}
          aria-describedby={describedBy}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => {
            e.target.select();
            e.target.scrollIntoView({ block: "center", behavior: "smooth" });
          }}
        />
      ))}
    </HStack>
  );
}
