import Link from "next/link";

import { modules } from "@/lib/modules";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
          <Link href="/" className="font-semibold">
            OPD Ortho SKH
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            {modules.map((mod) => (
              <Link
                key={mod.slug}
                href={mod.href}
                className="hover:text-foreground"
              >
                {mod.name}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
