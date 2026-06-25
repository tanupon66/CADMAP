# BGA Land Mapper v0.10.0

PWA แบบ Static สำหรับเปิด CAD XML, เปรียบเทียบ Original/Generated CAD, จับคู่ข้อมูลดิบ XLSX และแสดงตำแหน่ง Land บนกราฟิก โดยประมวลผลในเบราว์เซอร์ทั้งหมด

## สิ่งที่แก้ใน v0.10.0

### Land identifier ไม่บังคับเป็นตัวเลข

คอลัมน์ Land สามารถเป็นได้ทั้ง:

- ลำดับภายใน Part เช่น `1, 2, 3`
- XML global Land ID เช่น `15351`
- ชื่อ CAD แบบตัวอักษร/ตัวเลข เช่น `CU71`, `L0A0A`

ระบบจะตรวจชนิดคอลัมน์อัตโนมัติและแสดงโหมดที่ใช้:

- `local-index`
- `global-id`
- `cad-name`
- `auto`

ผู้ใช้สามารถเปลี่ยนคอลัมน์ `Land identifier` เองแล้วกดคำนวณ Mapping ใหม่ได้

### Mapping ด้วยข้อมูลสองชุดใดก็ได้

รองรับคู่หลักต่อไปนี้โดยไม่ต้องรอไฟล์ที่สาม:

1. Original CAD ↔ Generated CAD
2. Original CAD ↔ Raw XLSX
3. Generated CAD ↔ Raw XLSX

เมื่อมีครบสามชุด ระบบสามารถใช้ชื่อจาก CAD อีกฝั่งเป็นสะพาน เช่น Raw XLSX ใช้ชื่อ Generated CAD แต่กำลังแสดง Original CAD ระบบจะหา Generated Land จากชื่อแล้วส่งต่อด้วย XML ID/พิกัดมายัง Original Land

### ระดับความน่าเชื่อถือ

- `Name match` — ชื่อตรงกับ CAD ที่กำลังแสดง
- `CAD bridge` — ชื่อตรงกับ CAD อีกฝั่งและเชื่อมกลับด้วย XML ID/พิกัด
- `XML ID match` — ตรงกับ global Land ID
- `Unverified` — ใช้ลำดับภายใน Part เป็นข้อเสนอ
- `Ambiguous` — ชื่อซ้ำจนยังระบุตำแหน่งเดียวไม่ได้
- `Unmapped` — ไม่พบคู่

## ผลตรวจ test2.xlsx

- แถวข้อมูล: 12,448
- Component: U1
- Auto detect เลือกคอลัมน์ M
- โหมด: `global-id`
- Mapped: 12,448
- XML ID verified: 11,722
- Local-order suggestions: 726
- Unmapped: 0

คอลัมน์ N มีค่าข้อความ เช่น `L0A0A` และสามารถเลือกเป็น Land identifier ได้ หากชื่อเหล่านี้ตรงกับ Generated CAD ระบบจะจับคู่ด้วยชื่อโดยตรง

## การเปิด CAD อย่างเดียว

อัปโหลด Original CAD หรือ Generated CAD เพียงไฟล์เดียว โปรแกรมจะแสดง CAD ทันทีโดยไม่ต้องมี XLSX

## การใช้งานบน GitHub Pages

นำไฟล์ทั้งหมดในโฟลเดอร์นี้ไปไว้ที่ Root ของ Repository แล้วเปิด GitHub Pages จาก branch `main` / root

ไม่ต้องใช้ npm build และไม่ต้องมี Backend
