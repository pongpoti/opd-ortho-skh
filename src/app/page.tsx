import { ChevronRight } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { siteConfig } from "@/config/site"

// Cards link with plain <a>, not next/link — see the note in site-header.tsx.
export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">แดชบอร์ด</h1>
        <p className="mt-1 text-muted-foreground">เลือกระบบงานที่ต้องการใช้งาน</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {siteConfig.nav.map((item) => (
          <a key={item.href} href={item.href} className="block focus:outline-none">
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <CardContent className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <item.icon className="size-5" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2 font-medium">
                    {item.title}
                    {item.comingSoon ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                        เร็ว ๆ นี้
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm text-muted-foreground">{item.description}</span>
                </div>
                <ChevronRight className="mt-1.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {/* Temporary — for troubleshooting the mobile header display issue.
          Remove once resolved. */}
      <a href="/debug" className="text-sm text-muted-foreground underline underline-offset-4">
        ตรวจสอบปัญหาการแสดงผล
      </a>
    </main>
  )
}
