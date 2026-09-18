export type AppModule = {
  slug: string;
  name: string;
  description: string;
  href: string;
  icon: "clock";
};

export const modules: AppModule[] = [
  {
    slug: "waiting-time",
    name: "ระยะเวลารอคอย",
    description: "คำนวณระยะเวลารอคอยเฉลี่ยของผู้ป่วยนอกจากไฟล์ CSV รายเดือน",
    href: "/waiting-time",
    icon: "clock",
  },
];
