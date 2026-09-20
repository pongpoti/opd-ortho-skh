import { CalendarDays, ChartColumn, Clock } from "lucide-react";
import type { ComponentType } from "react";

import { NurseIcon } from "@/components/icons/nurse-icon";

type IconComponent = ComponentType<{ size?: number }>;

export const MODULE_ICONS: Record<"clock" | "chart" | "calendar" | "nurse", IconComponent> = {
  clock: Clock,
  chart: ChartColumn,
  calendar: CalendarDays,
  nurse: NurseIcon,
};
