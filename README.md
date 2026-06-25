# BGA / CAD Component Mapper v0.11.0

## สิ่งที่เปลี่ยน

- แสดงทุก Component ที่มี Land ใน CAD ไม่จำกัดเฉพาะ Component ที่พบในข้อมูลดิบหรือ BGA
- เปิด CAD XML อย่างเดียวแล้วเลือกดู Component ใดก็ได้ทันที
- Mapping Table รวมข้อมูล CAD โดยตรง: Component, Package, CAD local index, XML ID, CAD name, X/Y, Width/Length และวิธี Mapping
- Land ที่ไม่มีข้อมูลดิบแสดงสถานะ `CAD only` แทน `Unmapped`
- Export CSV ได้แม้มีเพียง CAD และรวมทั้ง CAD-only, Mapping และ Raw-only
- Component Excel เพิ่ม Excel Compatibility mode และแก้ลำดับ OOXML Drawing/Page Setup
- Compatibility mode ไม่ทำสำเนาตาราง Land ซ้ำทุก Zone ทำให้ไฟล์เล็กและเปิดง่ายขึ้น
- Original CAD ↔ Generated CAD ↔ Raw Data, Edit Mode, CAD Name Inspector, Histogram และ Manual Mapping ยังอยู่ครบ

## ใช้งาน

แตก ZIP แล้วอัปโหลดไฟล์ทั้งหมดไปที่ Root ของ GitHub Pages หรือ Cloudflare Pages ได้โดยตรง ไม่ต้อง build
