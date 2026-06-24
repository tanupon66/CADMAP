# BGA Land Mapper PWA v0.3.0

PWA สำหรับเปิด CAD XML และผลตรวจ X-ray XLSX, จับคู่หมายเลข Land และแสดงตำแหน่งบน Canvas โดยประมวลผลภายในเบราว์เซอร์

## อัปเดต v0.3.0

- ตัดฟังก์ชัน Result Code ออกจาก UI, Auto Detect, สีบนกราฟิก, ตาราง, CSV และ Backup
- เพิ่ม Measurement Histogram แยกตาม Part ที่กำลังเลือก
- เลือกจำนวน Histogram bins ได้ 10, 20, 30 หรือ 50
- แสดง Count, Min, Average, Median และ Max
- แสดงเส้นตำแหน่ง Measurement ของ Land ที่เลือกอยู่บน Histogram
- Heatmap บน CAD ใช้ค่า Measurement ต่ำ→สูงโดยตรง
- รายการ Part สร้างจาก Component/Package ที่พบในข้อมูลดิบเท่านั้น
- ถ้าข้อมูลดิบมีเพียง U1 โปรแกรมจะแสดงเฉพาะ U1 แม้ CAD จะมี Part อื่นอีกจำนวนมาก
- รองรับข้อมูลดิบที่มีหลาย Part โดยสร้าง Mapping, Histogram และ Viewer แยกตามแต่ละ Part
- แจ้ง Part ที่มีในข้อมูลดิบแต่ไม่พบใน CAD

## Manual Teach

- Manual remap: เลือก X-ray Land แล้วคลิก CAD Land ที่ถูกต้อง
- Lock/Unlock Anchor เพื่อยืนยันจุดอ้างอิง
- วิเคราะห์ Forward/Reverse และ Offset จาก Anchor
- Preview ก่อน Apply พร้อม Confidence, Conflict และ Out of range
- Shift, Nudge, Unmap ช่วง และ Undo/Redo
- Import/Export Backup JSON สำหรับ Anchor, Manual mapping และหมายเหตุ

## วิธีใช้งาน

1. นำเข้า ZIP หรือ XML + XLSX
2. ตรวจคอลัมน์ Component, Package, Land number และ Measurement
3. เลือก Part ที่มาจากข้อมูลดิบในช่อง Component
4. ดูตำแหน่ง CAD, Heatmap และ Histogram ของ Part นั้น
5. ถ้า Mapping ไม่ถูก ให้ใช้ `เลือก CAD ใหม่` และ `Manual Teach`
6. Export CSV หรือ Backup JSON

ไฟล์ตัวอย่างยืนยัน `X-ray 17660 → CAD CU71 → XML ID 18572` และ Mapping อัตโนมัติ `17,662/17,662` จุด

## GitHub Pages

อัปโหลดไฟล์และโฟลเดอร์ทั้งหมดไว้ที่ Root ของ Repository แล้วตั้ง `Settings → Pages → Deploy from a branch → main → / (root)` ไม่ต้อง Build หรือ `npm install`

## ข้อจำกัด

Pattern Engine รุ่นนี้รองรับลำดับ `+1` หรือ `−1` พร้อม Offset/Shift หากข้อมูลมีหลายแพตเทิร์น, ลำดับแบบงู หรือ Dummy Land ให้แบ่งช่วงและวาง Anchor แยกแต่ละช่วง
