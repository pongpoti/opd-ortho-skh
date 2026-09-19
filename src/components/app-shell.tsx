import Link from "next/link";
import { Bone } from "lucide-react";

import { auth, signOut } from "@/auth";
import { MODULE_ICONS } from "@/lib/module-icons";
import { modules } from "@/lib/modules";

const ROLE_LABEL: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  doctor: "แพทย์",
  nurse: "พยาบาล",
};

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <div className="navbar shadow-sm" style={{ backgroundColor: "#F0EAD6", color: "#4A3F30" }}>
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Bone className="size-5" />
            OPD Ortho SKH
          </Link>
          <nav className="flex gap-1">
            {modules.map((mod) => {
              const Icon = MODULE_ICONS[mod.icon];
              return (
                <Link
                  key={mod.slug}
                  href={mod.href}
                  className="btn btn-ghost btn-sm hover:bg-black/5"
                  style={{ color: "#4A3F30" }}
                >
                  <Icon className="size-4" />
                  {mod.name}
                </Link>
              );
            })}
          </nav>
          {session?.user?.isRegistered && (
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm">
                {session.user.firstName ?? session.user.lineDisplayName}
                {session.user.role && ` (${ROLE_LABEL[session.user.role]})`}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button className="btn btn-ghost btn-sm" style={{ color: "#4A3F30" }}>
                  ออกจากระบบ
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
