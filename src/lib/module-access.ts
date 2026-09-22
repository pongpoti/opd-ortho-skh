import type { UserRole } from "@/auth";

import { modules, type AppModule } from "./modules";

/** Admin + nurse can enter cast room; doctors cannot. */
export function canAccessCastRoom(role?: UserRole | null): boolean {
  return role === "admin" || role === "nurse";
}

/** Dashboard (view/edit all logs) is admin-only. */
export function canAccessCastRoomDashboard(role?: UserRole | null): boolean {
  return role === "admin";
}

/** Modules visible in home / dock / desktop nav for this role. */
export function modulesForRole(role?: UserRole | null): AppModule[] {
  return modules.filter((mod) => {
    if (mod.slug === "cast-room") return canAccessCastRoom(role);
    return true;
  });
}
