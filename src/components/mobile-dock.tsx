"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

import { MODULE_ICONS } from "@/lib/module-icons";
import { modules } from "@/lib/modules";

export function MobileDock() {
  const pathname = usePathname();

  return (
    <div className="dock shrink-0 !static sm:hidden">
      <Link href="/" className={pathname === "/" ? "dock-active" : undefined}>
        <Home className="size-5" />
        <span className="dock-label">หน้าแรก</span>
      </Link>
      {modules.map((mod) => {
        const Icon = MODULE_ICONS[mod.icon];
        const active = pathname === mod.href;
        return (
          <Link
            key={mod.slug}
            href={mod.href}
            className={active ? "dock-active" : undefined}
          >
            <Icon className="size-5" />
            <span className="dock-label">{mod.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
