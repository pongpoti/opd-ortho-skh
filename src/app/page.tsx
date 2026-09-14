import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { siteConfig } from "@/config/site"

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">แดชบอร์ด</h1>
        <p className="mt-1 text-muted-foreground">เลือกระบบงานที่ต้องการใช้งาน</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {siteConfig.nav.map((item) => (
          <Link key={item.href} href={item.href} className="block focus:outline-none">
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <CardContent className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <item.icon className="size-5" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-sm text-muted-foreground">{item.description}</span>
                </div>
                <ChevronRight className="mt-1.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}
