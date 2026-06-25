# BGA Land Mapper PWA v0.6.0

PWA สำหรับเปิด CAD XML และข้อมูล X-ray XLSX/ZIP แล้วแสดงตำแหน่ง Land บนกราฟิก โดยเวอร์ชันนี้เปลี่ยนลอจิกเป็น Safe Mapping เพื่อไม่ยืนยัน Mapping จากลำดับ XML โดยอัตโนมัติ

## สิ่งที่แก้ใน v0.6.0

- ลำดับ XML เป็นเพียง `Auto guess / Unverified` ไม่ถือว่า Mapping ถูกต้อง
- จุดที่ถือว่า `Confirmed` ต้องมาจากการคลิกใน Edit Mode หรือ Manual Anchor ที่ผู้ใช้ยืนยัน
- ตัดการกระจาย `taught-forward` แบบทั้งชุด
- Pattern เติมได้เฉพาะช่วงระหว่าง Anchor อย่างน้อย 2 จุดที่พิสูจน์ลำดับ +1 หรือ -1 ได้ตรงกันพอดี
- Pattern ที่ Apply ยังคงเป็นข้อเสนอ ไม่ใช่ Confirmed
- กู้คืน Backup v0.5.0 แบบปลอดภัย: เก็บ Manual Anchor จริงและหมายเหตุ แต่ละทิ้ง Mapping ที่ระบบกระจายหรือสลับให้เอง

## Fast Edit Mode

1. เปิดไฟล์ ZIP หรือ XML + XLSX
2. กด `โหมด Edit`
3. เลือก X-ray Land จากตารางหรือค้นหาเลข Land
4. คลิก CAD Land ที่ถูกต้องบนกราฟิก
5. จุดนั้นจะเป็น Confirmed ทันที
6. หากเปิด `เลื่อนไป X-ray ถัดไปอัตโนมัติ` โปรแกรมจะเลือกแถวถัดไปให้พร้อมคลิกต่อ

เมื่อ CAD Land เป้าหมายถูกใช้โดย Auto guess ของแถวอื่น ระบบจะ Unmap แถวนั้นโดยไม่สลับตำแหน่งเดิมไปให้ เพราะการสลับอัตโนมัติอาจสร้างความผิดพลาดต่อเนื่อง หากเป้าหมายถูก Confirmed อยู่แล้ว ระบบจะถามก่อน

## สถานะ Mapping

- `Confirmed`: ผู้ใช้ยืนยันด้วย Edit Mode/Anchor
- `Unverified`: Auto order หรือ Pattern suggestion
- `Unmapped`: ยังไม่มีตำแหน่ง CAD

## การติดตั้งบน GitHub Pages

อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ไว้ที่ root ของ repository แล้วเปิด GitHub Pages จาก branch `main` และโฟลเดอร์ `/ (root)` ไม่ต้อง build และไม่ต้องติดตั้ง dependency

## ทดสอบ

```bash
node tests/test-app-smoke.mjs
node tests/test-static.mjs
node tests/test-safe-edit-static.mjs
node tests/test-manual-pattern.mjs
node tests/test-parsers.mjs /path/to/project.zip
node tests/test-duplicates.mjs /path/to/project.zip
node tests/test-raw-part-filter.mjs
```
