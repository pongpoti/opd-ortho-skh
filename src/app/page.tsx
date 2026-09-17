"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Badge, Card, Icon, Title } from "@tremor/react"

import { siteConfig } from "@/config/site"

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <Title>แดชบอร์ด</Title>
        <p className="mt-1 text-tremor-default text-tremor-content dark:text-dark-tremor-content">
          เลือกระบบงานที่ต้องการใช้งาน
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {siteConfig.nav.map((item) => (
          <Link key={item.href} href={item.href} className="block focus:outline-none">
            <Card
              className="h-full transition-colors hover:bg-tremor-background-subtle focus-visible:ring-2 focus-visible:ring-tremor-brand/50 dark:hover:bg-dark-tremor-background-subtle"
              decoration="left"
              decorationColor="blue"
            >
              <div className="flex items-start gap-4">
                <Icon
                  icon={item.icon}
                  variant="light"
                  color="blue"
                  size="lg"
                  className="bg-blue-500/10 dark:bg-blue-500/20"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2 font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                    {item.title}
                    {item.comingSoon ? (
                      <Badge size="xs" color="slate">
                        เร็ว ๆ นี้
                      </Badge>
                    ) : null}
                  </span>
                  <span className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                    {item.description}
                  </span>
                </div>
                <ChevronRight
                  className="mt-1.5 size-4 shrink-0 text-tremor-content-subtle dark:text-dark-tremor-content-subtle"
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
