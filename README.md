# BGA Land Mapper PWA

โปรแกรม PWA แบบ Static สำหรับนำเข้าไฟล์ CAD XML และไฟล์ผลตรวจ X-ray XLSX แล้วจับคู่หมายเลข Land ของเครื่องกับชื่อและพิกัดใน CAD พร้อมแสดงตำแหน่งบน Canvas

## ผลที่ยืนยันจากไฟล์ตัวอย่าง

ไฟล์ที่ใช้ทดสอบ:

- `r4172-b0001-01_r01-smb-0430-doe_odb-A.XML`
- `test1.xlsx`

พบว่า Excel ใช้หมายเลข Land แบบ **ลำดับภายใน Component U1** ส่วน XML ใช้ `LandId` แบบรวมทั้งบอร์ด

สำหรับ Component `U1`:

- XML Component ID: `191`
- Package: `BGA17662_4724_P0354`
- จำนวน Land ใน Excel: `17,662`
- จำนวน Land ใน XML สำหรับ U1: `17,662`
- XML global Land ID: `913–18,574` ต่อเนื่อง
- Offset ของไฟล์นี้: `912`
- สูตรตรวจสอบ: `XML global ID = X-ray local Land + 912`

ตัวอย่างจริง:

```text
X-ray Land 17660
→ ลำดับที่ 17660 ภายใน U1
→ XML global LandId 18572
→ CAD name CU71
→ Left 234.65 mm, Top 200.788 mm
→ Center 234.9 mm, 200.538 mm
```

โปรแกรมไม่ได้ใช้ Offset อย่างเดียว แต่จับคู่ Component + Package ก่อน แล้วเลือก Land ลำดับที่ `n` จากรายการ XML ที่เรียงตาม global ID เพื่อรองรับ Component อื่นที่ Offset ไม่เท่ากันหรือ ID ไม่ต่อเนื่อง

## ฟังก์ชันในเวอร์ชันต้นแบบ 0.1.0

- เปิด ZIP ที่มี XML และ XLSX โดยไม่ต้องแตกไฟล์
- เปิด XML และ XLSX แยกทีละไฟล์ได้
- Parser ทำงานในเบราว์เซอร์และไม่ส่งไฟล์ไปเซิร์ฟเวอร์
- ตรวจคอลัมน์ Component, Package, Land, Measurement และ Result code อัตโนมัติ
- ให้เปลี่ยนคอลัมน์เองแล้วคำนวณ Mapping ใหม่
- แสดง Land จำนวนมากบน Canvas พร้อม Zoom, Pan และ Fit
- ค้นหาจาก X-ray local Land, XML global ID หรือ CAD name
- แสดง Measurement เป็น Heatmap
- แสดง Result code โดยไม่เดาความหมายว่า Pass หรือ Fail
- แก้ Mapping ด้วยการเลือกแถวและคลิก Land ใหม่
- Undo การแก้ Mapping ล่าสุด
- เพิ่มชื่อแสดงผลหรือหมายเหตุ
- Export Mapping เป็น CSV
- Backup ค่า Column mapping, Alias และ Manual override เป็น JSON
- ติดตั้งเป็น PWA และใช้งาน Offline หลังเปิดแอปครั้งแรก

## วิธีใช้งาน

1. เปิดโปรแกรมผ่าน GitHub Pages
2. ลาก ZIP ลงในช่อง Import หรือคลิกเลือกไฟล์
3. รอจนสถานะขึ้น `พร้อม`
4. ตรวจคอลัมน์ที่ระบบเลือก:
   - Component: J
   - Package: I
   - Land number: M หรือ N
   - Measurement: T
   - Result code: V
5. ค้นหา `17660` โปรแกรมจะซูมไปยัง `CU71`
6. คลิก Export CSV เพื่อส่งออกตาราง Mapping ทั้งหมด

## การติดตั้งบน GitHub Pages

1. สร้าง Repository ใหม่
2. อัปโหลด **ไฟล์และโฟลเดอร์ภายในโฟลเดอร์นี้** ไปไว้ที่ Root ของ Repository
3. เปิด `Settings → Pages`
4. เลือก `Deploy from a branch`
5. เลือก Branch `main` และ Folder `/ (root)`
6. เปิด URL GitHub Pages ที่ระบบสร้างให้

ไม่ต้องรัน `npm install` และไม่มี Build step

## โครงสร้างไฟล์

```text
index.html              หน้าหลัก
styles.css              UI และ Responsive layout
app.js                  Viewer, Search, Mapping และ Export
parsers.js              XML/XLSX parser และ Mapping engine
zip-reader.js           ZIP reader แบบไม่ใช้ Library ภายนอก
manifest.webmanifest    การติดตั้ง PWA
sw.js                   Offline cache
icons/icon.svg          ไอคอนแอป
ANALYSIS_RESULTS_TH.md  รายงานผลวิเคราะห์ไฟล์จริง
```

## ข้อจำกัด

- XML parser รุ่นนี้ปรับให้ตรงกับโครงสร้าง `InspectionProjectXml` ที่อยู่ในไฟล์ตัวอย่าง
- XLSX reader รองรับข้อมูลพื้นฐาน เช่น Shared Strings, Number, Boolean และ Inline String แต่ยังไม่ใช่ Excel engine เต็มรูปแบบ
- ZIP64, ZIP ที่ใส่รหัสผ่าน และ Compression method อื่นนอกจาก Store/Deflate ยังไม่รองรับ
- ยังไม่แก้รูปร่าง CAD หรือเขียน XML กลับโดยตรง ฟังก์ชันปัจจุบันเน้น Mapping, Viewer และ Manual override
- CAD name ใน U1 มีชื่อซ้ำ จึงห้ามใช้ชื่อ CAD เป็น Primary key เพียงอย่างเดียว

## แนวทางเวอร์ชันถัดไป

- XML Mapping Wizard สำหรับเครื่องหรือโปรแกรม CAD คนละยี่ห้อ
- บันทึก Project ลง IndexedDB
- เปรียบเทียบไฟล์ X-ray หลายล็อตบน CAD เดียวกัน
- Layer, Rotation, Mirror และ Top/Bottom controls
- Export รูปตำแหน่งและรายงาน PDF
- Light CAD editor สำหรับย้าย/เพิ่ม/ลบ/เปลี่ยนชื่อ Land และ Export XML
