import { Clock, type LucideIcon } from "lucide-react"

export interface NavItem {
  title: string
  href: string
  description: string
  icon: LucideIcon
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
  ] satisfies NavItem[],
}
