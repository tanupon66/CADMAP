# ผลวิเคราะห์และการแก้ลอจิก v0.6.0

## สาเหตุที่ Mapping ผิด

ไฟล์ Backup v0.5.0 มี Overrides 12,216 รายการ โดยมี `taught-forward` 12,174 รายการ, `manual-anchor` 31 รายการ และ `manual-swap` 11 รายการ ลอจิกเดิมใช้ Anchor บางจุดสร้างสูตรลำดับต่อเนื่องไปยังพื้นที่ขนาดใหญ่ ทั้งที่ลำดับใน CAD ของ BGA นี้ไม่ได้เป็นลำดับเชิงเส้นเดียว จึงถูกเฉพาะตำแหน่งที่ผู้ใช้ใส่เอง

## ลอจิกใหม่

- Auto order เป็นเพียงข้อเสนอและความมั่นใจไม่เกิน 40%
- Confirmed เกิดจากการคลิก Edit Mode หรือ Anchor ที่ผู้ใช้ยืนยันเท่านั้น
- ไม่มีการ Swap ตำแหน่งเดิมให้ X-ray แถวอื่นอัตโนมัติ
- เป้าหมายที่มี Auto guess อยู่จะ Unmap เจ้าของเดิม
- เป้าหมายที่ Confirmed อยู่จะถามผู้ใช้ก่อน
- Safe Pattern ไม่ extrapolate ออกนอก Anchor
- Safe Pattern ต้องมี Anchor อย่างน้อย 2 จุด และระยะ X-ray ต้องเท่ากับระยะ CAD index แบบ +1/-1 พอดี

## การ Migration Backup เก่า

เมื่อนำเข้า Backup v0.5.0 โปรแกรมจะเก็บเฉพาะ `manual-anchor`, `manual-direct`, จุดที่มี `verified: true`, หมายเหตุ และ Manual Unmap ที่ชัดเจน ส่วน `taught-*`, `manual-swap`, Pattern suggestion และ Shift suggestion จะถูกละทิ้ง

## ผลทดสอบไฟล์จริง

- CAD Components: 2,591
- CAD Lands: 24,625
- Raw-data Part ที่แสดง: U1
- X-ray rows: 17,662
- Duplicate CAD-name groups: 1,169
- Duplicate positions: 2,338
- Parser, part filtering, duplicate detection, app smoke, safe-edit static และ safe-pattern tests ผ่าน
