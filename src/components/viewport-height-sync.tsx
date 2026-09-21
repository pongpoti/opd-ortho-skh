"use client";

import { useEffect } from "react";

// Input types that don't bring up a text-entry keyboard (they use a native
// picker/toggle instead), so focusing one shouldn't count as "keyboard open".
const NON_TEXT_INPUT_TYPES = new Set([
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "submit",
  "button",
  "reset",
  "image",
]);

function opensKeyboard(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUT_TYPES.has(el.type);
  return el.isContentEditable;
}

export function ViewportHeightSync() {
  useEffect(() => {
    function setAppHeight() {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${height}px`);
    }

    setAppHeight();

    window.addEventListener("resize", setAppHeight);
    window.visualViewport?.addEventListener("resize", setAppHeight);
    window.visualViewport?.addEventListener("scroll", setAppHeight);

    return () => {
      window.removeEventListener("resize", setAppHeight);
      window.visualViewport?.removeEventListener("resize", setAppHeight);
      window.visualViewport?.removeEventListener("scroll", setAppHeight);
    };
  }, []);

  // Whether the on-screen keyboard is open is tracked directly from focus,
  // not inferred from viewport geometry: comparing window.innerHeight against
  // visualViewport.height assumes the former stays put while the keyboard is
  // up, but some in-app webviews (LINE's included) resize the layout viewport
  // right along with the visual one, keeping that difference near zero and
  // making the geometry check never fire. Focus is a direct, reliable signal
  // for this instead of a side effect that varies by webview configuration.
  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    function update() {
      clearTimeout(hideTimer);
      if (opensKeyboard(document.activeElement)) {
        document.documentElement.dataset.keyboardOpen = "true";
        return;
      }
      // A focusout immediately followed by a focusin on the next field (e.g.
      // HnInput's auto-advance between digit boxes) should never register as
      // the keyboard closing in between -- defer the "false" a tick so a
      // same-task refocus cancels it first.
      hideTimer = setTimeout(() => {
        if (!opensKeyboard(document.activeElement)) {
          document.documentElement.dataset.keyboardOpen = "false";
        }
      }, 50);
    }

    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      clearTimeout(hideTimer);
    };
  }, []);

  return null;
}
