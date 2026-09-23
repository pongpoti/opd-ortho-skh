/**
 * Convert a non-negative integer amount (baht) to Thai wording ending with บาทถ้วน.
 * Supports 0 … 9_999_999 which is enough for case-log totals.
 */
export function thaiBahtInWords(amount: number): string {
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return "ศูนย์บาทถ้วน";
  return `${thaiIntegerInWords(n)}บาทถ้วน`;
}

const DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];

function thaiIntegerInWords(n: number): string {
  if (n === 0) return "";
  if (n < 10) return DIGITS[n];
  if (n < 20) return n === 10 ? "สิบ" : `สิบ${n === 11 ? "เอ็ด" : DIGITS[n % 10]}`;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    const tensWord = tens === 2 ? "ยี่สิบ" : `${DIGITS[tens]}สิบ`;
    if (ones === 0) return tensWord;
    return `${tensWord}${ones === 1 ? "เอ็ด" : DIGITS[ones]}`;
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    return `${DIGITS[hundreds]}ร้อย${thaiIntegerInWords(rest)}`;
  }
  if (n < 10000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    return `${DIGITS[thousands]}พัน${thaiIntegerInWords(rest)}`;
  }
  if (n < 100000) {
    const tenThousands = Math.floor(n / 10000);
    const rest = n % 10000;
    return `${thaiIntegerInWords(tenThousands)}หมื่น${thaiIntegerInWords(rest)}`;
  }
  if (n < 1000000) {
    const hundredThousands = Math.floor(n / 100000);
    const rest = n % 100000;
    return `${thaiIntegerInWords(hundredThousands)}แสน${thaiIntegerInWords(rest)}`;
  }
  const millions = Math.floor(n / 1000000);
  const rest = n % 1000000;
  return `${thaiIntegerInWords(millions)}ล้าน${thaiIntegerInWords(rest)}`;
}
