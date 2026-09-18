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

/**
 * The original staff roster (15 physician names) is personnel data that
 * wasn't carried over during the port and can't be reconstructed. Until
 * this is populated, every calculation will correctly fail with "staff
 * group is empty" rather than silently misclassifying everyone as
 * non-staff — fill in the real names before relying on results.
 */
export const STAFF_NAMES: string[] = [];
