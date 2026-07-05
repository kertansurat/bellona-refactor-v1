# BELLONA Refactor v2.2 Clean

ฐานจาก `bellona-gvg-main(1).zip` แล้วแยกโมดูลใหม่ทั้งชุด

## สิ่งที่ทำ
- แยก inline CSS ไปที่ `css/modules/00-production-core.css`
- แยก inline JS ไปที่ `js/modules/00-production-core.js`
- ย้าย Dashboard JS ไปที่ `js/modules/14-dashboard.js`
- ย้าย Party Export JS ไปที่ `js/modules/16-party-export.js`
- แก้ `index.html` ให้เรียกไฟล์แบบไม่ซ้อนทับ
- แก้ path พื้นหลังเป็น `assets/bg-rooc.png` ผ่าน CSS module
- Dashboard v2.1 layout ตาม mockup ล่าสุด
- Reward quota table เลื่อน scroll ได้เมื่อสมาชิกเยอะ
- เพิ่ม Dropdown กรองสถานะในแถบรายชื่อสมาชิก
- ใช้ Firebase / API / assets เดิม

## วิธีอัป
อัปไฟล์และโฟลเดอร์ทั้งหมดข้างในโฟลเดอร์นี้ไปไว้ที่ root repo:
- `index.html`
- `css/`
- `js/`
- `assets/`
- `api/`
- `maps.json`

หลังอัปให้ Redeploy Vercel และกด Hard Refresh
