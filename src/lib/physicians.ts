// Sorted ascending per Thai dictionary order (localeCompare(..., "th"), which
// correctly reorders leading sara vowels like เ-/แ-/โ- after their
// consonant) -- keep new entries sorted the same way, not just appended.
export const PHYSICIANS = [
  "เฉลิมพล กินรี",
  "ชวพล กิตตินภดล",
  "ชัยวัฒน์ ล้อพงศ์ไพบูลย์",
  "เทพรักษา เหมพรหมราช",
  "ธนกร วงศ์สล้างกุล",
  "ธีรฉัตต์ ธนะสารสมบูรณ์",
  "ปราการ ชุมภูปัน",
  "ปองสิทธิ์ โพธิคุณ",
  "ปิติพงศ์ จู่ภิบาล",
  "พลสันต์ สันธนพิพัฒน์กุล",
  "วรงค์พร พงศ์ภิญโญภาพ",
  "วันทนันท์ หล่อวัฒนากิจชัย",
  "วิฑูรย์ กิตติพิชัย",
  "สิทธิพงศ์ เกตุวงศ์วิริยะ",
  "โอภาส ไชยมหาพฤกษ์",
] as const;
