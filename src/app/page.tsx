import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { siteConfig } from "@/config/site"

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">แดชบอร์ด</h1>
        <p className="text-muted-foreground">เลือกระบบงานที่ต้องการใช้งาน</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {siteConfig.nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Card className="h-full gap-0 py-5 transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
              <div className="flex items-start gap-4 px-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <item.icon className="size-5" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {item.title}
                    {item.comingSoon ? (
                      <Badge variant="secondary" className="font-normal">
                        เร็ว ๆ นี้
                      </Badge>
                    ) : null}
                  </span>
                  <span className="text-sm text-muted-foreground">{item.description}</span>
                </div>
                <ChevronRight
                  className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}
