import { BarChart3, Clock, Settings, type LucideIcon } from "lucide-react"

export interface NavItem {
  title: string
  href: string
  description: string
  icon: LucideIcon
  comingSoon?: boolean
}

export const siteConfig = {
  name: "OPD ศัลยกรรมกระดูก",
  shortName: "OPD ORTHO",
  nav: [
    {
      title: "ระยะเวลารอคอย",
      href: "/waitingtime",
      description: "คำนวณระยะเวลารอคอยเฉลี่ยของห้องตรวจศัลยกรรมกระดูก จากไฟล์ CSV รายเดือน",
      icon: Clock,
    },
    {
      title: "รายงานสรุป",
      href: "/reports",
      description: "ภาพรวมและรายงานสรุปข้อมูลของแผนก",
      icon: BarChart3,
      comingSoon: true,
    },
    {
      title: "ตั้งค่า",
      href: "/settings",
      description: "ตั้งค่าระบบและการแจ้งเตือน",
      icon: Settings,
      comingSoon: true,
    },
  ] satisfies NavItem[],
}
