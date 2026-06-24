# BGA Land Mapper PWA v0.2.0

PWA สำหรับเปิด CAD XML และผลตรวจ X-ray XLSX, จับคู่หมายเลข Land และแสดงตำแหน่งบน Canvas โดยประมวลผลภายในเบราว์เซอร์

## ฟังก์ชันใหม่

- Manual remap: เลือก X-ray Land แล้วคลิก CAD Land ที่ถูกต้อง
- Lock/Unlock Anchor เพื่อยืนยันจุดอ้างอิง
- Manual Teach วิเคราะห์ Forward/Reverse และ Offset จาก Anchor
- Preview ก่อน Apply พร้อมจำนวน Confidence สูง, ต้องตรวจ, Conflict และ Out of range
- กำหนดช่วงเริ่ม/สิ้นสุดและ Shift เพิ่มเติม
- Preview เฉพาะระหว่าง Anchor
- Apply ทั้งหมดหรือเฉพาะ Confidence สูง
- Nudge จุดที่เลือก −1/+1
- Shift ทั้งช่วง −1/+1 และ Unmap ช่วง โดยรักษา Anchor
- Undo/Redo สูงสุด 24 Transaction
- Import/Export Backup JSON ที่เก็บ Anchor, Manual mapping และหมายเหตุ
- Export CSV เพิ่ม `anchor_locked` และ `mapping_method`

## วิธีใช้ Manual Teach

1. นำเข้า ZIP หรือ XML + XLSX
2. ค้นหา X-ray Land ที่ทราบตำแหน่งจริง
3. กด `เลือก CAD ใหม่` แล้วคลิก CAD Land ที่ถูกต้อง จุดนั้นจะถูกล็อกเป็น Anchor
4. ทำซ้ำอย่างน้อย 1–3 จุด
5. เปิด `Manual Teach` แล้วกด `สร้าง Preview`
6. ตรวจ Direction, Formula, Conflict และวง Preview บนกราฟิก
7. กด `ยืนยันและใช้ Pattern` หรือ `ใช้เฉพาะ Confidence สูง`
8. Export CSV และ Backup JSON

ไฟล์ตัวอย่างยืนยัน `X-ray 17660 → CAD CU71 → XML ID 18572` และ Mapping อัตโนมัติ `17,662/17,662` จุด

## GitHub Pages

อัปโหลดไฟล์และโฟลเดอร์ทั้งหมดไว้ที่ Root ของ Repository แล้วตั้ง `Settings → Pages → Deploy from a branch → main → / (root)` ไม่ต้อง Build หรือ `npm install`

## ข้อจำกัด

Pattern Engine รุ่นนี้รองรับลำดับ `+1` หรือ `−1` พร้อม Offset/Shift หากข้อมูลมีหลายแพตเทิร์น, ลำดับแบบงู หรือ Dummy Land ให้แบ่งช่วงและวาง Anchor แยกแต่ละช่วง
