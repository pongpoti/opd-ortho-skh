import { statisticsReports, type StatisticsReport } from "./statistics-reports";

export type AppModule = {
  slug: string;
  name: string;
  description: string;
  href: string;
  icon: "chart" | "calendar";
  subitems?: StatisticsReport[];
};

export const modules: AppModule[] = [
  {
    slug: "statistics",
    name: "สถิติ",
    description: "รายงานและสถิติของแผนก",
    href: "/statistics",
    icon: "chart",
    subitems: statisticsReports,
  },
  {
    slug: "duty-schedule",
    name: "ตารางเวร",
    description: "ตารางเวรแพทย์และพยาบาลประจำวัน",
    href: "/duty-schedule",
    icon: "calendar",
  },
];
