import Link from "next/link";

import { MODULE_ICONS } from "@/lib/module-icons";
import { modules } from "@/lib/modules";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">OPD Ortho SKH</h1>
        <p className="text-base-content/70">เครื่องมือภายในสำหรับแผนกผู้ป่วยนอกศัลยกรรมกระดูก</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {modules.map((mod) => {
          const Icon = MODULE_ICONS[mod.icon];
          return (
            <Link key={mod.slug} href={mod.href}>
              <div className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md">
                <div className="card-body">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <h2 className="card-title">{mod.name}</h2>
                  </div>
                  <p className="text-base-content/70">{mod.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
