# ผลการแก้ไข v0.10.0

## สาเหตุ Unmapped เดิม

ลอจิกเดิมใช้ `Number(row[landColumn])` ทำให้ชื่อแบบ `L0A0A` กลายเป็น `NaN` และถูกจัดเป็น Unmapped แม้ชื่อจะตรงกับ CAD

## ลอจิกใหม่

1. ตรวจ Land identifier แบบข้อความก่อนโดยไม่บังคับแปลงเป็นตัวเลข
2. ตรวจชื่อกับ CAD ที่กำลังแสดง
3. ตรวจชื่อกับ CAD อีกฝั่งและ Bridge กลับด้วย XML ID/พิกัด
4. ตรวจ XML global ID
5. ใช้ local index เป็นข้อเสนอสุดท้ายและยังไม่ถือว่า Confirmed
6. ชื่อซ้ำหลายตำแหน่งจะแสดง Ambiguous แทนการเลือกแบบสุ่ม

## Pair Mapping

- CAD ↔ CAD: XML ID ก่อน พิกัดเป็น fallback
- CAD ↔ Raw: ชื่อ, XML ID หรือลำดับตามชนิดคอลัมน์
- Raw ↔ CAD อีกฝั่ง: ใช้ชื่ออีก CAD เป็น Bridge เมื่อมี Original และ Generated พร้อมกัน

## Test2

- Rows: 12,448
- Selected identifier: Column M
- Mode: global-id
- Mapped: 12,448
- Verified by XML ID: 11,722
- Unverified local-order fallback: 726
- Unmapped: 0

## Regression tests

ผ่าน Parser, text identifier, two-source bridge, safe manual pattern, CAD inspector, CAD compare, duplicate detection, XLSX report และ static/smoke tests
