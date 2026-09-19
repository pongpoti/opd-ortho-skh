import { PHYSICIANS } from "@/lib/physicians";

export const REQUIRED_COLUMNS = [
  "Date",
  "Time",
  "ส่งตรวจที่แผนก",
  "พบแพทย์ที่แผนก",
  "ระยะเวลารอ",
  "แพทย์",
] as const;

export const CLINIC = "ห้องตรวจศัลยกรรมกระดูก";

export const EXCLUDED_DEPARTMENTS = ["วัดบางปลา", "วัดเกตุม"];

export const TIME_WINDOW = { start: "06:00:00", end: "16:00:00" };

export const STAFF_NAMES: string[] = [...PHYSICIANS];
