# BGA Land Mapper PWA v0.9.0

PWA แบบ Static สำหรับเปิด CAD XML, เปรียบเทียบ Original CAD กับ Generated CAD, จับคู่ Land, ตรวจชื่อ CAD, วิเคราะห์ Measurement และสร้างรายงาน Excel พร้อมภาพตำแหน่ง Component ภายในเบราว์เซอร์

## ฟังก์ชันใหม่ v0.9.0 — Component Report Excel

กด **Component Excel** หลังนำเข้า CAD โปรแกรมสามารถสร้างไฟล์ `.xlsx` โดยไม่ต้องส่งข้อมูลขึ้นเซิร์ฟเวอร์

### ขอบเขตรายงาน

- เฉพาะ Component ที่กำลังแสดง
- ทุก Part ที่พบในข้อมูลดิบ XLSX
- ใช้งานได้เมื่อเปิด CAD XML เพียงไฟล์เดียว แม้ยังไม่มีข้อมูล X-ray

### ตัวเลือกรายงาน

- แบ่งภาพ Component เป็น 2×2, 3×3 หรือ 4×4 โซน
- เลือกข้อความบนภาพขยาย: ชื่อ CAD, หมายเลข X-ray Land, ทั้งสองอย่าง หรือไม่แสดงข้อความ
- เลือกชื่อจาก CAD ที่กำลังดู, Original CAD หรือ Generated CAD
- เลือกความละเอียดภาพ Standard, Detail หรือ High Detail
- เปิด/ปิด Measurement Heatmap

### ชีตที่สร้าง

- `Summary` — สรุป Board, CAD, X-ray และลิงก์ไปยังชีตแต่ละ Component
- `Map <Part>` — ภาพรวม Component ตามพิกัด CAD พร้อมเส้นแบ่งโซน
- `Data <Part>` — ตารางข้อมูล Land ทุกจุด
- `<Part> Zone A1...` — ภาพขยายแต่ละโซนและข้อมูล Land ภายในโซน
- `Histogram <Part>` — ภาพ Histogram, สถิติ และข้อมูลแต่ละ Bin
- `CAD Name Changes` — ตารางชื่อ Original ↔ Generated เมื่อชื่อแตกต่างกัน
- `Duplicate Names` — รายการตำแหน่งที่ชื่อ CAD ซ้ำ

ตาราง Land ประกอบด้วย Part, Package, Zone, Local index, X-ray Land, XML ID, ชื่อ CAD, ชื่อ Original, ชื่อ Generated, พิกัด X/Y, ขนาด, Measurement, Confirmed และสถานะ Mapping

### การนำทางใน Excel

- คลิกชื่อ Map/Data ใน Summary เพื่อไปยังชีตนั้น
- คลิก Zone ใน `Data <Part>` เพื่อเปิดภาพขยายของโซน
- คลิกชื่อชีต Zone ในหน้า Map เพื่อดูบริเวณนั้นโดยตรง

## ฟังก์ชันเดิม

- เปิด CAD XML อย่างเดียวและแสดงกราฟิกทันที
- อัปโหลด Original CAD และ Generated CAD แยกกัน
- เปรียบเทียบชื่อ พิกัด Land ที่หายและ Land ที่เกิน
- CAD Name Inspector สำหรับชื่อซ้ำ ชื่อว่าง และชื่อเกิน 5 ตัวอักษร
- Export CAD XML ฉบับแก้ไขโดยรักษาข้อมูลอื่นไว้
- Measurement Histogram แบบละเอียด
- แสดงชื่อ CAD ซ้ำบนกราฟิก
- Fast Edit Mode และ Safe Pattern
- Backup/Restore JSON
- Export Mapping CSV
- PWA Offline บน GitHub Pages

## Deploy บน GitHub Pages

อัปโหลดไฟล์ภายในโฟลเดอร์นี้ไปยัง root ของ repository แล้วเปิด GitHub Pages จาก branch `main` และโฟลเดอร์ `/ (root)` ไม่ต้อง build หรือ `npm install`
