import { CalendarDays, CalendarRange, ChartColumn, ClipboardList, Clock, Cross, FileDown } from "lucide-react";
import type { ComponentType } from "react";

type IconComponent = ComponentType<{ size?: number }>;

export const MODULE_ICONS: Record<
  "clock" | "chart" | "calendar" | "planner" | "cross" | "list" | "file",
  IconComponent
> = {
  clock: Clock,
  chart: ChartColumn,
  calendar: CalendarDays,
  planner: CalendarRange,
  cross: Cross,
  list: ClipboardList,
  file: FileDown,
};
