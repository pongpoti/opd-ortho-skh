/**
 * Waits for the on-screen keyboard's viewport resize to settle before
 * scrolling a focused field into view. Scrolling immediately on focus uses
 * stale (pre-keyboard) geometry, and "center" alignment pushes a field on a
 * long page down near the bottom dock (which rides up to sit above the
 * keyboard) instead of just clearing the fold — "nearest" scrolls the
 * minimum distance needed, keeping the field well clear of the dock.
 */
export function scrollFocusedIntoView(el: HTMLElement) {
  setTimeout(() => el.scrollIntoView({ block: "nearest", behavior: "smooth" }), 300);
}
