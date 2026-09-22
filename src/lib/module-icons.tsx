import { CalendarDays, ChartColumn, ClipboardList, Clock, Cross } from "lucide-react";
import type { ComponentType } from "react";

type IconComponent = ComponentType<{ size?: number }>;

export const MODULE_ICONS: Record<"clock" | "chart" | "calendar" | "cross" | "list", IconComponent> = {
  clock: Clock,
  chart: ChartColumn,
  calendar: CalendarDays,
  cross: Cross,
  list: ClipboardList,
};
