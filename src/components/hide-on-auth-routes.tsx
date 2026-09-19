"use client";

import { usePathname } from "next/navigation";

import { AUTH_ROUTES } from "@/lib/auth-routes";

export function HideOnAuthRoutes({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hidden = AUTH_ROUTES.includes(pathname);

  return (
    <div className={hidden ? "invisible h-0 overflow-hidden" : "shrink-0"}>
      {children}
    </div>
  );
}
