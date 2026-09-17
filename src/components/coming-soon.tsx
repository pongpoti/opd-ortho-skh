import type { ReactNode } from "react"
import { Card, Text, Title } from "@tremor/react"

// icon is a pre-rendered element, not a component reference: this file has
// no "use client", and a Server Component can't pass a bare function/
// component reference as a prop into a Client Component (Tremor's Card/
// Title are client components) — only an already-rendered node crosses
// that boundary cleanly.
export function ComingSoon({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex shrink-0 items-center justify-center rounded-tremor-default bg-blue-500/10 p-2.5 text-tremor-brand dark:bg-blue-500/20 dark:text-dark-tremor-brand">
            {icon}
          </span>
          <Title>{title}</Title>
          <Text>{description}</Text>
        </div>
        <div className="mt-4 border-t border-tremor-border pt-4 dark:border-dark-tremor-border">
          <Text>หน้านี้อยู่ระหว่างการพัฒนา เร็ว ๆ นี้</Text>
        </div>
      </Card>
    </main>
  )
}
