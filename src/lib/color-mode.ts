export type ColorMode = "light" | "dark";

const STORAGE_KEY = "opd-color-mode";

export function getStoredColorMode(): ColorMode | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function applyColorMode(mode: ColorMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function setStoredColorMode(mode: ColorMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore write failures (private browsing, storage disabled, etc.)
  }
  applyColorMode(mode);
}
