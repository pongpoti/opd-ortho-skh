import Link from "next/link";

import { modules } from "@/lib/modules";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">OPD Ortho SKH</h1>
        <p className="text-base-content/70">เครื่องมือภายในสำหรับแผนกผู้ป่วยนอกศัลยกรรมกระดูก</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {modules.map((mod) => (
          <Link key={mod.slug} href={mod.href}>
            <div className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md">
              <div className="card-body">
                <h2 className="card-title">{mod.name}</h2>
                <p className="text-base-content/70">{mod.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
