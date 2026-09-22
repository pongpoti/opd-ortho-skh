import type { MODULE_ICONS } from "./module-icons";

export type ModuleSubpageIcon = keyof typeof MODULE_ICONS;

export type ModuleSubpage = {
  slug: string;
  name: string;
  description: string;
  href: string;
  icon: ModuleSubpageIcon;
  adminOnly?: boolean;
};
