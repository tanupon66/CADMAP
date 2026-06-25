# ผลทดสอบ BGA Land Mapper v0.9.0

## ข้อมูลจริงที่ใช้ทดสอบ

- CAD Components: 2,591
- CAD Lands: 24,625
- Raw-data Part: U1
- X-ray Lands: 17,662
- Measurement column: T
- Mapping rows: 17,662

## Component Report Excel

ทดสอบสร้างรายงาน U1 โดยแบ่ง 2×2 โซน:

- Summary: 1 ชีต
- Component Map: 1 ชีต
- Land Data: 17,662 แถวข้อมูล
- Zone detail: 4 ชีต รวมข้อมูล Land ครบ 17,662 จุด
- Histogram: 50 bins
- Duplicate Names: 2,338 ตำแหน่ง
- รวม 9 ชีต

ไฟล์ทดสอบที่มี 17,662 Land มีขนาดประมาณ 3.7 MB หลังบีบอัด XLSX และสามารถอ่านกลับด้วย XLSX Parser ของโปรแกรมได้ครบ:

- `Data U1`: 17,665 แถวรวมชื่อเรื่องและ Header
- Zone A1: 4,392 Land
- Zone A2: 4,424 Land
- Zone B1: 4,407 Land
- Zone B2: 4,439 Land

## การตรวจโครงสร้าง XLSX

ทดสอบไฟล์ขนาดเล็กด้วย Spreadsheet parser ภายนอกและตรวจพบ:

- Sheet names ถูกต้อง
- Summary และตารางข้อมูลอ่านได้
- รูปภาพถูกฝังใน `xl/media`
- Internal hyperlinks ถูกสร้าง
- ไม่พบ Formula error หรือ Reference เสีย

## Regression tests

ผ่านการทดสอบ:

- XML/XLSX Parser กับไฟล์จริง
- Raw-data Part filter
- ชื่อ CAD ซ้ำ 1,169 กลุ่ม / 2,338 ตำแหน่ง
- Safe Edit Mode
- CAD Name Inspector และ Export XML
- Original ↔ Generated CAD comparison 24,625 / 24,625 Land
- Component Report static UI
- XLSX ZIP writer, images, sheets และ parser round-trip
