export type StatisticsReport = {
  slug: string;
  name: string;
  description: string;
  href: string;
  icon: "clock";
};

export const statisticsReports: StatisticsReport[] = [
  {
    slug: "waiting-time",
    name: "ระยะเวลารอคอย",
    description: "คำนวณระยะเวลารอคอยเฉลี่ยของผู้ป่วยนอกจากไฟล์ CSV รายเดือน",
    href: "/statistics/waiting-time",
    icon: "clock",
  },
];
