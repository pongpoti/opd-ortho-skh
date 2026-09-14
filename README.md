# opd-ortho-skh

เครื่องมือคำนวณระยะเวลารอคอยเฉลี่ยของห้องตรวจศัลยกรรมกระดูก (OPD ORTHO) โรงพยาบาลสมุทรสาคร จากไฟล์ CSV รายเดือน

สร้างด้วย [Next.js](https://nextjs.org), TypeScript และ [shadcn/ui](https://ui.shadcn.com) ประมวลผลไฟล์ทั้งหมดฝั่ง client ในเบราว์เซอร์ ไม่มีการอัปโหลดข้อมูลขึ้นเซิร์ฟเวอร์

## วิธีใช้งาน

1. เลือกเดือนและกรอกปี พ.ศ.
2. อัปโหลดไฟล์ CSV สองไฟล์ชื่อ `1.csv` (วันที่ 1–15) และ `2.csv` (วันที่ 16 ถึงสิ้นเดือน)
3. กดปุ่ม "ประมวลผล" เพื่อดูสรุประยะเวลารอคอยเฉลี่ยของทั้งหมด กลุ่มบุคลากร และกลุ่มไม่ใช่บุคลากร

## Development

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) เพื่อดูผลลัพธ์

## Project structure

- `src/app` – Next.js App Router entrypoints
- `src/components/opd-wait-time-calculator.tsx` – UI หลักของเครื่องมือ
- `src/components/ui` – shadcn/ui components
- `src/lib/opd-calculator.ts` – ตรรกะการแปลง CSV, กรอง และคำนวณค่าเฉลี่ย (pure TypeScript, ไม่ผูกกับ UI)

## Build

```bash
npm run build
npm run start
```
