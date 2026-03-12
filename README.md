# ระบบจัดตารางเรียนตารางสอน v2
**React + Vite + Bootstrap + Axios**

## การเปลี่ยนแปลง v2
- ✅ 5 คาบ/วัน (ตัดคาบ 6 ออก)
- ✅ ประถม 1-6 เท่านั้น (ตัดมัธยมออก)
- ✅ ครู 1 คน สอนแค่ระดับเดียว แต่สอนได้หลายวิชา
- ✅ ตารางเรียนเต็มทุกคาบ ไม่มีช่องว่าง
- ✅ วิชาเดียวกัน ห้องเดียวกัน → ต้องคนละวัน
- ✅ ลูกเสือ Fix วันพุธ คาบ 5

## รัน
```bash
npm install
npm run dev
# เปิด http://localhost:3000
```

## โครงสร้างไฟล์
```
src/
├── api/timetableService.js       ← Axios GET/POST (connect backend)
├── components/TimetableGrid.jsx  ← ตาราง grid
├── utils/mockData.js             ← ข้อมูล mock + config คาบเรียน
├── utils/timetableGenerator.js   ← Algorithm random
├── App.jsx                       ← หน้าหลัก
└── index.css
```

## เชื่อมต่อ Backend
1. สร้าง `.env`: `VITE_API_URL=http://localhost:5000/api`
2. ใน `App.jsx` uncomment โค้ด API และ comment mock ออก
