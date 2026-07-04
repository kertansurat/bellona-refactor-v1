# BELLONA Refactor v1.1 Modular Split

สถานะชุดนี้: แยก CSS / JS เป็นโมดูลตามลำดับ Production เดิม โดยยังไม่เปลี่ยน Logic หลัก

## กติกาโปรเจกต์
- Production เดิมห้ามแตะ
- ใช้ Firebase เดิม
- UI + Function ต้องเทียบเท่า Production ล่าสุด 100%
- ไฟล์ `_source/PRODUCTION_REFERENCE_DO_NOT_EDIT.html` เก็บไว้เป็น reference เท่านั้น ห้ามแก้

## โครงสร้าง CSS ใหม่
- `css/modules/00-base.css` — base, body, scrollbar, glass panel
- `css/modules/01-map-tactical.css` — map/tactical canvas
- `css/modules/02-party-base.css` — party card / slot base
- `css/modules/03-members-admin.css` — member inline edit, backup/activity log
- `css/modules/04-layout-fixes.css` — layout/reward layout fixes
- `css/modules/05-reward-queue.css` — reward queue + party power summary
- `css/modules/06-auth-lock-bg.css` — login, admin lock, background
- `css/modules/07-party-dual-plan.css` — dual party plan UI
- `css/modules/08-party-responsive.css` — party responsive/export mode
- `css/modules/09-party-view-toggle.css` — main/sub party view toggle + hidden hotfix

## โครงสร้าง JS ใหม่
- `js/modules/00-core-state.js` — constants, global state, maps, party plan/view helpers
- `js/modules/01-normalize-attendance-firebase.js` — normalize player, attendance, Firebase write helpers
- `js/modules/02-admin-auth-storage-backup.js` — login/session, activity log, admin tools, backup, Firebase import/realtime
- `js/modules/03-members.js` — job icons, member add/validate/filter/waiting list
- `js/modules/04-party.js` — party grid, drag/drop, assign, release, auto assign, clear
- `js/modules/05-members-manager-stats.js` — member table, inline edit, bulk actions, stats
- `js/modules/06-rewards-wheel.js` — reward quota, capture, reward wheel, eligible popup
- `js/modules/07-reward-queue.js` — reward queue admin/member/check/report/Firebase sync
- `js/modules/08-tabs-maps-tactical.js` — tabs, maps, logo, drawing canvas, tactical markers
- `js/modules/09-bootstrap.js` — renderAll / startup bootstrap

## Legacy placeholder
- `css/bellona-production.css` และ `js/bellona-app.js` ถูกเก็บเป็น placeholder เพื่อไม่ให้ชื่อไฟล์เดิมหาย แต่ runtime ใช้ไฟล์ใน `modules/` แล้ว

## วิธีเทส
1. เปิด `index.html` ผ่าน local server เช่น VS Code Live Server
2. Login Guest ดู UI ทุกแท็บก่อน
3. Login Admin แล้วเทสเพิ่ม/แก้สมาชิก, จัดปาร์ตี้, tactical, reward queue
4. เช็ค Console ต้องไม่มี error
5. ห้าม deploy ทับ Production เดิม ให้สร้าง Vercel project ใหม่เท่านั้น

## v1.2 Performance Pass

Safe optimization layer added in `js/modules/10-performance-pass.js`.

What changed:
- Debounced player search/filter input to reduce repeated renders while typing.
- Cached waiting-list HTML and skips DOM rewrites when the visible list has not changed.
- Avoids rendering the hidden player sidebar on non-party/member tabs.
- Uses requestAnimationFrame inside scheduled renders to make Firebase realtime updates smoother.
- Adds lazy/async image attributes to job icons inside the waiting list.

No Firebase schema changes. No production project changes. UI/function behavior is intended to match v1.1 / Production reference.
