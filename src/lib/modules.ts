import { castRoomSubpages } from "./cast-room-subpages";
import type { ModuleSubpage } from "./module-subpages";
import { statisticsReports } from "./statistics-reports";

export type AppModule = {
  slug: string;
  name: string;
  description: string;
  href: string;
  icon: "chart" | "calendar" | "cross";
  subitems?: ModuleSubpage[];
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
    icon: "cross",
    subitems: castRoomSubpages,
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

/** Browser tab title: module name, or "module - subitem" when a subpage is active. */
export function modulePageTitle(moduleSlug: string, subitemSlug?: string): string {
  const mod = modules.find((m) => m.slug === moduleSlug);
  if (!mod) return "OPD Ortho SKH";
  if (!subitemSlug) return mod.name;
  const sub = mod.subitems?.find((s) => s.slug === subitemSlug);
  return sub ? `${mod.name} - ${sub.name}` : mod.name;
}
