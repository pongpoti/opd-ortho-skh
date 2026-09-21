"use client";

import { useRef, useEffect, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { HStack, Input } from "@chakra-ui/react";

import { scrollFocusedIntoView } from "@/lib/scroll-into-view-on-focus";

/**
 * DigitBoxInput — a fixed-length value as single-digit boxes, OTP-style.
 * Typing a digit advances focus to the next box; Backspace on an empty box
 * steps back and clears the one before it; pasting a full value fills every
 * box in one go.
 *
 * Digits are always left-contiguous (no holes): clearing a box truncates from
 * that index onward so `join("")` cannot collapse a sparse array into the
 * wrong HN/year string.
 *
 * `prefix` renders extra fixed, disabled boxes before the editable ones
 * (e.g. the "25" every Buddhist year here starts with) — `value`/`onChange`
 * only ever carry the editable digits, not the prefix.
 */
export interface DigitBoxInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  ariaLabel?: string;
  describedBy?: string;
}

export function DigitBoxInput({ length, value, onChange, prefix = "", ariaLabel = "digit", describedBy }: DigitBoxInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");
  const total = prefix.length + length;

  useEffect(() => {
    if (value.length > length) onChange(value.slice(0, length));
  }, [value, length, onChange]);

  const setDigit = (i: number, d: string) => {
    if (d) {
      // Disallow typing ahead of the first empty box — keeps the string packed.
      if (value.length < i) {
        refs.current[value.length]?.focus();
        return;
      }
      onChange((value.slice(0, i) + d + value.slice(i + 1)).slice(0, length));
      return;
    }
    // Clearing truncates from this index so later digits don't shift left
    // into the wrong positions (which would corrupt an HN).
    onChange(value.slice(0, i));
  };

  const handleChange = (i: number, e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (raw && !digit) return;
    setDigit(i, digit);
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      setDigit(i - 1, "");
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  };

  const boxStyle = {
    textAlign: "center" as const,
    fontFamily: "mono",
    fontWeight: "normal" as const,
    fontSize: "18px",
    px: 0,
    h: 12,
    minW: 0,
    flex: "1",
  };

  return (
    <HStack gap={1.5} role="group" aria-label={ariaLabel}>
      {[...prefix].map((d, i) => (
        <Input
          key={`prefix-${i}`}
          {...boxStyle}
          value={d}
          disabled
          aria-label={`${ariaLabel} หลักที่ ${i + 1} จาก ${total}`}
        />
      ))}
      {digits.map((d, i) => (
        <Input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          {...boxStyle}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={1}
          value={d}
          aria-label={`${ariaLabel} หลักที่ ${prefix.length + i + 1} จาก ${total}`}
          aria-describedby={describedBy}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => {
            e.target.select();
            scrollFocusedIntoView(e.target);
          }}
        />
      ))}
    </HStack>
  );
}
