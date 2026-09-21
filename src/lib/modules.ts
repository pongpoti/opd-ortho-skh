import { statisticsReports, type StatisticsReport } from "./statistics-reports";

export type AppModule = {
  slug: string;
  name: string;
  description: string;
  href: string;
  icon: "chart" | "calendar" | "nurse";
  subitems?: StatisticsReport[];
};

export const modules: AppModule[] = [
  {
    slug: "duty-schedule",
    name: "ตารางเวร",
    description: "ตารางเวรแพทย์และพยาบาลประจำวัน",
    href: "/duty-schedule",
    icon: "calendar",
  },
  {
    slug: "cast-room",
    name: "เวรห้องเฝือก",
    description: "บันทึกผู้ป่วยใส่เฝือกประจำเวร",
    href: "/cast-room",
    icon: "nurse",
  },
  {
    slug: "statistics",
    name: "สถิติ",
    description: "รายงานและสถิติของแผนก",
    href: "/statistics",
    icon: "chart",
    subitems: statisticsReports,
  },
];
