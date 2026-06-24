# รายงานวิเคราะห์ไฟล์ CAD XML และ X-ray XLSX

## 1. สรุปไฟล์

### CAD XML

- Board: `r4172-b0001-01_r01-smb-0430-doe_odb`
- ขนาดบอร์ด: `450 × 368 mm`
- จำนวน Component: `2,591`
- จำนวน Land ทั้งบอร์ด: `24,625`

### X-ray XLSX

- Worksheet: `Sheet1`
- จำนวนแถวข้อมูล: `17,662`
- จำนวนคอลัมน์: `22` (`A:V`)
- Component ทุกแถว: `U1`
- Package ทุกแถว: `BGA17662_4724_P0354`
- Land number: `1–17,662` ต่อเนื่อง

## 2. คอลัมน์ที่ตรวจพบ

| หน้าที่ | คอลัมน์ | ตัวอย่าง |
|---|---:|---|
| Package | I | `BGA17662_4724_P0354` |
| Component | J | `U1` |
| Feature type | L | `Land` |
| X-ray local Land | M/N | `1–17662` |
| Measurement | T | `498`, `486`, `565` |

คอลัมน์ M และ N มีหมายเลขเหมือนกันทุกแถว โปรแกรมเลือก M เป็นค่าเริ่มต้นแต่ผู้ใช้เปลี่ยนเป็น N ได้

## 3. โครงสร้าง U1 ใน XML

- XML Component ID: `191`
- Component name: `U1`
- Package: `BGA17662_4724_P0354`
- Center position: `(224.959, 183.16) mm`
- Angle: `180°`
- จำนวน Land: `17,662`
- Global `LandId` ต่ำสุด: `913`
- Global `LandId` สูงสุด: `18,574`
- ID ต่อเนื่องทั้งหมด: ใช่
- Bounding box ของจุดกึ่งกลาง:
  - X: `166.209–283.709 mm`
  - Y: `124.271–242.05 mm`

## 4. วิธี Mapping ที่ถูกต้อง

หมายเลขใน Excel ไม่ใช่ XML global `LandId` แต่เป็นลำดับ Land ภายใน Component

ขั้นตอนที่ถูกต้อง:

1. อ่าน Component จาก Excel: `U1`
2. อ่าน Package จาก Excel: `BGA17662_4724_P0354`
3. หา XML Component ที่ชื่อและ Package ตรงกัน: ID `191`
4. ดึง Land ของ Component 191 ทั้งหมด
5. เรียงด้วย XML global `LandId`
6. ใช้ X-ray Land `n` เลือกรายการลำดับที่ `n`

เพราะไฟล์นี้ global ID ต่อเนื่องตั้งแต่ 913 สูตรย่อจึงเป็น:

```text
XML global LandId = X-ray local Land + 912
```

แต่โปรแกรมยังใช้วิธีเรียงลำดับเป็นหลัก เพื่อไม่ให้พังเมื่อไฟล์อื่นมี ID ขาดช่วง

## 5. ตัวอย่าง Land 17660

| รายการ | ค่า |
|---|---:|
| X-ray local Land | `17660` |
| Excel row | `17661` |
| XML global LandId | `18572` |
| CAD name | `CU71` |
| Left | `234.65 mm` |
| Top | `200.788 mm` |
| Center X | `234.9 mm` |
| Center Y | `200.538 mm` |
| Size | `0.5 × 0.5 mm` |
| Measurement | `565` |

ถ้านำ `17660` ไปค้นเป็น XML global ID โดยตรง จะได้ `AH80` ซึ่งเป็นตำแหน่งคนละจุดและผิดสำหรับแถว X-ray 17660

## 6. ความสมบูรณ์ของ Mapping

- Mapping สำเร็จ: `17,662 / 17,662`
- Unmapped: `0`
- Confidence ของไฟล์นี้: `100%` ตามเงื่อนไขโครงสร้าง
  - Component ตรงกัน
  - Package ตรงกัน
  - จำนวน Land ตรงกัน
  - XML global ID ต่อเนื่อง

## 7. ข้อมูล Measurement

Measurement ในคอลัมน์ T:

- ต่ำสุด: `114`
- สูงสุด: `695`
- ค่าเฉลี่ย: `484.4993`
- โปรแกรม v0.3.0 แสดงค่าเป็น Heatmap และ Histogram โดยไม่ใช้คอลัมน์สถานะอื่น

## 8. ข้อควรระวังเรื่องชื่อ CAD ซ้ำ

ใน U1 มี:

- CAD name ไม่ซ้ำ: `16,493` ชื่อ
- ชื่อที่พบมากกว่า 1 ตำแหน่ง: `1,169` ชื่อ
- Land ที่อยู่ในกลุ่มชื่อซ้ำ: `2,338` จุด

ตัวอย่างชื่อซ้ำ ได้แก่ `AJ1`, `AJ11`, `AK10` ซึ่งอยู่คนละพิกัด ดังนั้น Primary key ที่ปลอดภัยควรประกอบด้วย:

```text
Component ID + X-ray local Land + XML global LandId + Coordinate
```

ไม่ควรใช้ CAD name อย่างเดียว

## 9. สิ่งที่โปรแกรมต้นแบบทำได้จากข้อมูลชุดนี้

- ค้นหมายเลขเครื่องแล้วซูมไปยัง CAD Land ที่ถูกต้อง
- แสดงชื่อ CAD, global ID, พิกัดและข้อมูลผลตรวจพร้อมกัน
- แสดงทุก Land เป็นกราฟิกที่ Zoom/Pan ได้
- แสดง Heatmap และ Histogram จาก Measurement
- เตือนเมื่อชื่อ CAD ซ้ำ
- แก้ Mapping ด้วยตนเองเมื่อไฟล์รุ่นอื่นไม่เรียงแบบเดิม
- ส่งออกตาราง Mapping ที่รวมข้อมูลทั้งสองไฟล์


## อัปเดต v0.3.0

- ไม่ใช้ Result Code ในการ Mapping หรือแสดงผลอีกต่อไป
- Measurement แสดงเป็น Heatmap และ Histogram
- Viewer แสดงเฉพาะ Part ที่พบในข้อมูลดิบ โดยไฟล์ตัวอย่างนี้แสดงเฉพาะ U1
- หากข้อมูลดิบมีหลาย Part โปรแกรมจะแยก Component, Mapping และ Histogram ให้แต่ละ Part

## อัปเดต v0.4.0 — Histogram แบบละเอียด

เพิ่มหน้าต่าง Histogram เต็มหน้าจอสำหรับวิเคราะห์ Measurement ของ Part ที่เลือก โดยรองรับ 10–200 bins, Count/Percent, การซูมด้วยล้อเมาส์, การลากเลือกช่วง, การกำหนด Min/Max, สถิติ Q1/Q3 และ Standard deviation รวมถึงการคลิกแท่งเพื่อดู Count, Percent และ Cumulative ของแต่ละช่วง

ช่วงที่กำลังดูสามารถใช้เน้น Land บน CAD ได้ โดย Land นอกช่วงจะถูกลดความเด่นลง ทำให้ตรวจหาพื้นที่ที่มี Measurement อยู่ในกลุ่มที่สนใจได้เร็วขึ้น และสามารถส่งออก Histogram ปัจจุบันเป็น CSV ได้
