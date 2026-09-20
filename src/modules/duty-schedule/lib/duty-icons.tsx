import { Bandage, Building2, GraduationCap, MapPin, Stethoscope, type LucideIcon } from "lucide-react";

import type { DutyKey } from "./duty-data";

export const DUTY_ICONS: Record<DutyKey, LucideIcon> = {
  d1: Stethoscope,
  d2: GraduationCap,
  d3: MapPin,
  d4: Building2,
  d5: Bandage,
};
