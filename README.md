# BGA Land Mapper PWA v0.4.0

PWA สำหรับเปิด CAD XML และผลตรวจ X-ray XLSX, จับคู่หมายเลข Land, แสดงตำแหน่งบน CAD และวิเคราะห์ Measurement โดยประมวลผลภายในเบราว์เซอร์

## อัปเดต v0.4.0 — Detailed Histogram

- เพิ่มปุ่มขยาย Histogram แบบเต็มหน้าจอ
- รองรับ 10–200 bins ในหน้ารายละเอียด
- สลับแกน Y ระหว่างจำนวน Land และเปอร์เซ็นต์
- ซูมช่วง Measurement ด้วยล้อเมาส์
- ลากบนกราฟเพื่อเลือกและขยายช่วงค่า
- กรอกค่า Min/Max เพื่อดูช่วงที่กำหนดเอง
- คลิกแท่งเพื่อดูช่วง, Count, Percent และ Cumulative
- แสดง Total, In-range, Min, Q1, Average, Median, Q3, Max และ Standard deviation
- แสดงเส้นตำแหน่ง Measurement ของ Land ที่เลือก
- เน้นเฉพาะ Land ที่อยู่ในช่วง Histogram บน CAD ได้
- Export ตาราง Histogram ปัจจุบันเป็น CSV
- รองรับจอ Desktop, Tablet และ Mobile

## ฟังก์ชันเดิม

- เปิด ZIP ที่มี CAD XML และ X-ray XLSX ได้โดยตรง
- แสดงเฉพาะ Part ที่พบในข้อมูลดิบ เช่น ข้อมูลมีเพียง U1 จะแสดงเฉพาะ U1
- รองรับหลาย Part ในข้อมูลดิบ โดยแยก Mapping, Viewer และ Histogram ตาม Part
- Heatmap จาก Measurement
- Manual remap, Anchor, Manual Teach, Pattern Preview, Shift และ Unmap
- Undo/Redo
- Export Mapping CSV และ Backup JSON
- ทำงาน Offline หลังติดตั้ง PWA

## วิธีใช้ Histogram แบบละเอียด

1. นำเข้าโปรเจกต์และเลือก Part
2. กดปุ่ม `⛶` ข้าง Histogram หรือคลิกกราฟย่อ
3. เลือกจำนวน Bins และรูปแบบแกน Y
4. ใช้ล้อเมาส์เพื่อซูม หรือกดลากบนกราฟเพื่อเลือกช่วง
5. คลิกแท่งเพื่อดูจำนวนและเปอร์เซ็นต์ของช่วงนั้น
6. เปิด `เน้นเฉพาะ Measurement ในช่วงที่กำลังดูบน CAD` เพื่อเชื่อมผล Histogram กับตำแหน่ง Land
7. กด `Export Histogram CSV` เมื่อต้องการนำข้อมูลไปวิเคราะห์ต่อ

## GitHub Pages

อัปโหลดไฟล์และโฟลเดอร์ทั้งหมดไว้ที่ Root ของ Repository แล้วตั้ง `Settings → Pages → Deploy from a branch → main → / (root)` ไม่ต้อง Build หรือ `npm install`

## ผลทดสอบกับไฟล์ตัวอย่าง

- CAD Components: 2,591
- CAD Lands: 24,625
- Raw-data Parts: 1 (`U1`)
- X-ray Lands: 17,662
- Mapping: 17,662/17,662
- Measurement: อ่านจากคอลัมน์ T
- ตัวอย่าง `X-ray 17660 → CAD CU71 → XML ID 18572`
