import { GraduationCap, Hospital, Scissors, Syringe, type LucideIcon } from "lucide-react";

import type { DutyKey } from "./duty-data";

export const DUTY_ICONS: Record<DutyKey, LucideIcon> = {
  d1: Scissors,
  d2: GraduationCap,
  d3: Hospital,
  d4: Hospital,
  d5: Syringe,
};
