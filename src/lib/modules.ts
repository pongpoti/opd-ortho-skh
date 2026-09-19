import { statisticsReports, type StatisticsReport } from "./statistics-reports";

export type AppModule = {
  slug: string;
  name: string;
  description: string;
  href: string;
  icon: "chart";
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
];
