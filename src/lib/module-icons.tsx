import { Clock, type LucideIcon } from "lucide-react";

import type { AppModule } from "./modules";

export const MODULE_ICONS: Record<AppModule["icon"], LucideIcon> = {
  clock: Clock,
};
