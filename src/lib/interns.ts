/** Full-name reference supplied by the hospital. Monthly rotation comes from
 * the duty calendar, not from this list. Keep the supplied spellings. */
export const INTERN_PHYSICIANS = [
  "กมลฉัตร สิริวรนาค",
  "กิตติศักดิ์ พงศ์วรินทร์",
  "จิฑา สุคนธ์พงษ์เผ่า",
  "ธนภรณ์ อร่ามทวีทอง",
  "นิธิษณ์ สุธรรมพร",
  "บาสิทธ อับดุล กาเดอร์",
  "เบญจนุช ภมร",
  "ปรัชญวัต คงทวีเลิศ",
  "ปวริศา เขมะโยธิน",
  "ปัณฑา เลิศภิยโยวงศ์",
  "ปุณยวีร์ พิเชียรโสภณ",
  "พรินท์รฎา อริยเกษมพัฒน์",
  "พิชชามล มานนท์",
  "ภรณี เกื้อมนตรี",
  "ภัทร ภัทรวรธรรม",
  "ภัทริน เทียมวีรสกุล",
  "ภูตะวัน จตุพรภักดี",
  "ภูมิรัฐ รัศมีโกเมน",
  "ภูริตภัทร จุฑากรณ์",
  "มณิสรา จิรพรสุวรรณ",
  "มัชฌิมาภรณ์ บุญนัด",
  "ลักษิกา ทวีวัฒนะกิจบวร",
  "วรวลักษณ์ สมดี",
  "วิชญะชัย โลว์",
  "วิศัลย์ศยา หนูทวี",
  "ศรัณยพงศ์ อัจฉริยะภากร",
  "ศึกษิต จันทนภุมมะ",
  "ศุภชัย ศุภพิมล",
  "สุวภัทร สุขขี",
  "อภิษฎา ณ สงขลา",
  "อาภานันท์ ศรีนิล",
  "เอกดนัย สมานุหัตถ์",
] as const;

/** Resolve only known identities; preserve an unfamiliar or qualified name
 * rather than assigning a guessed surname. The calendar uses จิทา for จิฑา. */
export function internFullName(raw: string): string {
  const name = raw.trim().replace(/\s+/gu, " ");
  const canonical = name.replace(/^จิทา(?= |$)/u, "จิฑา");
  const exact = INTERN_PHYSICIANS.find((full) => full === canonical);
  if (exact) return exact;
  if (canonical.includes(" ")) return name;
  const matches = INTERN_PHYSICIANS.filter((full) => full.split(" ")[0] === canonical);
  return matches.length === 1 ? matches[0] : name;
}
