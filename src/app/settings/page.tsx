import type { Metadata } from "next"

import { ComingSoon } from "@/components/coming-soon"
import { siteConfig } from "@/config/site"

const item = siteConfig.nav.find((navItem) => navItem.href === "/settings")!

export const metadata: Metadata = {
  title: item.title,
}

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={<item.icon className="size-6" aria-hidden="true" />}
      title={item.title}
      description={item.description}
    />
  )
}
