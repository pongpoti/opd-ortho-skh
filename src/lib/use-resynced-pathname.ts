"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function useResyncedPathname(): string {
  const routerPathname = usePathname();
  const [prevRouterPathname, setPrevRouterPathname] = useState(routerPathname);
  const [override, setOverride] = useState<string | null>(null);

  if (routerPathname !== prevRouterPathname) {
    setPrevRouterPathname(routerPathname);
    setOverride(null);
  }

  useEffect(() => {
    function resync() {
      setOverride(window.location.pathname);
    }

    window.addEventListener("pageshow", resync);
    document.addEventListener("visibilitychange", resync);

    return () => {
      window.removeEventListener("pageshow", resync);
      document.removeEventListener("visibilitychange", resync);
    };
  }, []);

  return override ?? routerPathname;
}
