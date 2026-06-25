# BGA Land Mapper PWA v0.8.0

PWA แบบ Static สำหรับเปิด CAD XML, เปรียบเทียบ Original CAD กับ Generated CAD, จับคู่ชื่อ Land, แสดง BGA, วิเคราะห์ Measurement และแก้ Mapping ภายในเบราว์เซอร์

## ฟังก์ชันใหม่ v0.8.0

### เปิด CAD อย่างเดียวได้ทันที

- กด **Original CAD** หรือวาง XML ในพื้นที่ Import
- โปรแกรมอ่าน Component และ Land แล้วแสดงกราฟิกทันที
- ไม่จำเป็นต้องมี XLSX
- หาก CAD มีหลาย Part โปรแกรมเลือก Part ที่มี Land มากที่สุดก่อน และสามารถสลับ Part จากเมนู Component
- เมื่อเพิ่ม XLSX ภายหลัง โปรแกรมจึงสร้าง Mapping กับข้อมูลดิบ

### Original CAD ↔ Generated CAD

1. อัปโหลดไฟล์ต้นฉบับด้วยปุ่ม **Original CAD**
2. อัปโหลด XML ที่แก้ชื่อแล้วด้วยปุ่ม **Generated CAD**
3. กด **เปรียบเทียบ CAD**

ระบบจับคู่ตามลำดับความน่าเชื่อถือ:

1. Component ID ที่ชื่อหรือ Package สอดคล้องกัน
2. Component name + Package
3. Component name
4. Package + จำนวน Land
5. Land XML ID
6. พิกัดใกล้ที่สุดภายในค่าความคลาดเคลื่อนที่กำหนด

ผลลัพธ์แยกเป็น:

- ตรงกัน
- เปลี่ยนชื่อ
- ตำแหน่งเปลี่ยน
- เปลี่ยนทั้งชื่อและตำแหน่ง
- หายใน Generated CAD
- เกินมาใน Generated CAD

สามารถค้นหา กรอง ดูคู่บนกราฟิก และ Export ตาราง Mapping เป็น CSV ได้

### Overlay บนกราฟิก

เปิด **ซ้อน Original ↔ Generated** เพื่อแสดงสองไฟล์พร้อมกัน:

- สีฟ้าอมเขียว = ตำแหน่ง Original
- สีชมพู = ตำแหน่ง Generated
- เส้นประ = Land คู่เดียวกันที่ตำแหน่งขยับ
- เลือกรายการในตารางเปรียบเทียบเพื่อ Fit และแสดงชื่อเดิม → ชื่อใหม่

### สลับ CAD ที่กำลังดู

เมนู **CAD ที่แสดง** รองรับ:

- Original CAD
- Generated CAD

เมื่อสลับไฟล์ Viewer, Component list, CAD Name Inspector และ Mapping กับ XLSX จะอัปเดตตาม CAD ที่เลือก

## CAD Name Inspector

- ตรวจชื่อซ้ำภายใน Part
- ตรวจชื่อว่างและชื่อเกินความยาว ค่าเริ่มต้น 5 ตัวอักษร
- แก้ชื่อเองหรือสร้างชื่อใหม่อัตโนมัติ
- Apply ชื่อใหม่บนกราฟิก
- Export รายงาน CSV
- Export CAD XML ฉบับแก้ไขโดยไม่เขียนทับไฟล์ต้นฉบับ

## ฟังก์ชันเดิม

- อ่าน ZIP ที่มี XML + XLSX หรือเปิดไฟล์แยก
- Measurement Histogram แบบละเอียด
- แสดงชื่อ CAD ซ้ำบนกราฟิก
- Fast Edit Mode สำหรับยืนยัน Mapping ทีละจุด
- Safe Pattern ระหว่าง Anchor
- Backup/Restore JSON
- Export Mapping CSV
- PWA Offline บน GitHub Pages

## Deploy บน GitHub Pages

อัปโหลดไฟล์ภายในโฟลเดอร์ `bga-land-mapper` ไปยัง root ของ repository แล้วเปิด GitHub Pages จาก branch `main` และโฟลเดอร์ `/ (root)` ไม่ต้อง build หรือ npm install
