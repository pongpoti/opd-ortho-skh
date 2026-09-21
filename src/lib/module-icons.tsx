import { CalendarDays, ChartColumn, Clock, Cross } from "lucide-react";
import type { ComponentType } from "react";

type IconComponent = ComponentType<{ size?: number }>;

export const MODULE_ICONS: Record<"clock" | "chart" | "calendar" | "cross", IconComponent> = {
  clock: Clock,
  chart: ChartColumn,
  calendar: CalendarDays,
  cross: Cross,
};
