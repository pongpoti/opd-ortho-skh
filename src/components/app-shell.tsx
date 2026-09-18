import Link from "next/link";

import { modules } from "@/lib/modules";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="navbar border-b border-base-200 bg-base-100">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-6">
          <Link href="/" className="text-lg font-semibold">
            OPD Ortho SKH
          </Link>
          <nav className="flex gap-1">
            {modules.map((mod) => (
              <Link key={mod.slug} href={mod.href} className="btn btn-ghost btn-sm">
                {mod.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
