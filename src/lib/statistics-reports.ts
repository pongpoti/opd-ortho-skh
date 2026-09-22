import type { ModuleSubpage } from "./module-subpages";

export type StatisticsReport = ModuleSubpage;

export const statisticsReports: StatisticsReport[] = [
  {
    slug: "waiting-time",
    name: "ระยะเวลารอคอย",
    description: "คำนวณระยะเวลารอคอยเฉลี่ยของผู้ป่วยนอกจากไฟล์ CSV รายเดือน",
    href: "/statistics/waiting-time",
    icon: "clock",
  },
];
