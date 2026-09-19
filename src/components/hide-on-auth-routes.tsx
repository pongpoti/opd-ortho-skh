"use client";

import { useResyncedPathname } from "@/lib/use-resynced-pathname";
import { AUTH_ROUTES } from "@/lib/auth-routes";

export function HideOnAuthRoutes({ children }: { children: React.ReactNode }) {
  const pathname = useResyncedPathname();
  const hidden = AUTH_ROUTES.includes(pathname);

  return (
    <div className={hidden ? "invisible h-0 overflow-hidden" : "shrink-0"}>
      {children}
    </div>
  );
}
