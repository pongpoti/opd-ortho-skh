import liff from "@line/liff";

let initPromise: Promise<void> | null = null;

export function ensureLiffInit(): Promise<void> {
  if (!initPromise) {
    initPromise = liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! }).catch((err) => {
      // Allow a later retry to call liff.init again instead of replaying a
      // rejected promise forever.
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

const LIFF_INIT_TIMEOUT_MS = 8000;

// liff.init() can hang indefinitely if the SDK is waiting on a native LINE
// app bridge handshake that never arrives (e.g. flaky network). Callers that
// gate the whole UI on this promise need a bound so they never get stuck
// spinning forever. A timed-out wait still leaves the underlying init running;
// a later retry races the same promise again (and succeeds if init settled).
export function ensureLiffInitWithTimeout(ms = LIFF_INIT_TIMEOUT_MS): Promise<void> {
  return Promise.race([
    ensureLiffInit(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("LIFF init timed out")), ms)),
  ]);
}

export { liff };
