import Link from "next/link";
import { Stethoscope } from "lucide-react";

import { MODULE_ICONS } from "@/lib/module-icons";
import { modules } from "@/lib/modules";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="navbar bg-primary text-primary-content shadow-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Stethoscope className="size-5" />
            OPD Ortho SKH
          </Link>
          <nav className="flex gap-1">
            {modules.map((mod) => {
              const Icon = MODULE_ICONS[mod.icon];
              return (
                <Link
                  key={mod.slug}
                  href={mod.href}
                  className="btn btn-ghost btn-sm text-primary-content hover:bg-primary-content/10"
                >
                  <Icon className="size-4" />
                  {mod.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
