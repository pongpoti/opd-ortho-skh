import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center gap-3">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary" className="font-normal">
            อยู่ระหว่างการพัฒนา เร็ว ๆ นี้
          </Badge>
        </CardContent>
      </Card>
    </main>
  )
}
