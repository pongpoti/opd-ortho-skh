import type { Metadata } from "next"

import { OpdWaitTimeCalculator } from "@/components/opd-wait-time-calculator"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: siteConfig.nav[0].title,
  description: siteConfig.nav[0].description,
}

export default function WaitingTimePage() {
  return <OpdWaitTimeCalculator />
}
