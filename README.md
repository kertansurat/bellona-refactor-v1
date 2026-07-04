# BELLONA Refactor v2.0 Latest

ฐานจาก `bellona-gvg-3.5.zip` ซึ่งเป็น Production ล่าสุดที่ฟังก์ชันครบ

## วิธีอัป GitHub
อัปไฟล์/โฟลเดอร์ **ข้างในโฟลเดอร์นี้** ไปไว้ root repo:

- `index.html`
- `api/`
- `assets/`
- `css/`
- `js/`
- `maps.json`
- `README.md`

อย่าอัปโฟลเดอร์ซ้อนทั้งก้อน เช่น `bellona-refactor-v2.0-latest/index.html`

## สิ่งที่ทำใน v2.0 Latest

- ใช้ Production stable ล่าสุดเป็นฐาน 100%
- แยก inline CSS ไป `css/bellona-production.css`
- แยก inline JS หลักไป `js/modules/bellona-core.js`
- แยก fallback/export/firebase init เป็นไฟล์
- คง `assets/dashboard.js` และ `assets/js/party-export.js` ตามต้นฉบับ
- เพิ่ม `css/performance.css` และ `js/modules/10-performance-safe.js` แบบไม่แตะ logic หลัก

## Performance ที่เพิ่มแบบปลอดภัย

- ลด repaint/reflow ระหว่าง scroll ด้วย `contain`
- เพิ่ม `content-visibility:auto` ให้รายการยาว เช่น waiting list / reward queue rows
- lazy/async decode ให้รูป job icons ที่ render ภายหลัง
- debounce ช่องค้นหา/กรองรายชื่อ โดยไม่เปลี่ยนฟังก์ชัน `filterPlayers()` เดิม

## ข้อจำกัด

ยังไม่ทำ Virtual List เพราะเสี่ยงกระทบ Drag & Drop / Party Logic / Reward Queue Logic
