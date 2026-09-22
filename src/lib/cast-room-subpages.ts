import type { ModuleSubpage } from "./module-subpages";

export const castRoomSubpages: ModuleSubpage[] = [
  {
    slug: "log",
    name: "บันทึกข้อมูล",
    description: "บันทึกผู้ป่วยใส่เฝือกประจำเวร",
    href: "/cast-room",
    icon: "cross",
  },
  {
    slug: "dashboard",
    name: "รายการบันทึก",
    description: "ดูและแก้ไขรายการที่บันทึกไว้ (ผู้ดูแลระบบ)",
    href: "/cast-room/dashboard",
    icon: "list",
    adminOnly: true,
  },
];
