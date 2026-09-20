import { Cross, GraduationCap, Hospital, PocketKnife, type LucideIcon } from "lucide-react";

import type { DutyKey } from "./duty-data";

export const DUTY_ICONS: Record<DutyKey, LucideIcon> = {
  d1: PocketKnife,
  d2: GraduationCap,
  d3: Hospital,
  d4: Hospital,
  d5: Cross,
};

export const DUTY_ICON_COLORS: Record<DutyKey, string> = {
  d1: "duty.d1",
  d2: "duty.d2",
  d3: "duty.d3",
  d4: "duty.d4",
  d5: "duty.d5",
};
