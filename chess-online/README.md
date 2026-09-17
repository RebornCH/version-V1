# 🐉 หมากรุกออนไลน์ - Chinese Dragon Chess

เว็บเกมหมากรุกออนไลน์ที่สมบูรณ์ พร้อมเล่นกับเพื่อนหรือผู้เล่นทั่วโลก

## ✨ ฟีเจอร์หลัก

### 🎮 โหมดการเล่น
- **⚡ สุ่มหาแมตช์** - จับคู่กับผู้เล่นแบบสุ่มทันที
- **🏠 สร้างห้องใหม่** - สร้างห้องส่วนตัวเชิญเพื่อนมาเล่น
- **🚪 เข้าห้องที่มีอยู่** - เข้าร่วมห้องด้วยรหัส
- **🎯 เล่นคนเดียว (Offline)** - โหมดออฟไลน์เล่นกับตัวเอง

### 🌟 ระบบออนไลน์
- ✅ Real-time multiplayer ด้วย Socket.IO
- ✅ สร้างห้องส่วนตัวพร้อมรหัส 8 หลัก
- ✅ แชร์ลิงก์เชิญเพื่อนได้ทันที
- ✅ ระบบสุ่มหาแมตช์อัตโนมัติ
- ✅ นาฬิกาจับเวลาแยกแต่ละฝั่ง
- ✅ เสนอเสมอ / ยอมแพ้
- ✅ แสดงหมากที่ถูกกิน
- ✅ อัพเดทสถานะเกมแบบเรียลไทม์

### ♟️ กฎกติกาครบถ้วน
- การเดินหมากทุกชนิด (King, Queen, Rook, Bishop, Knight, Pawn)
- Castling (เข้าป้อม) ทั้ง King-side และ Queen-side
- En Passant
- Pawn Promotion (เลือกโปรโมท)
- ตรวจสอบ Check, Checkmate, Stalemate
- เสมอจาก Insufficient Material, Threefold Repetition, Fifty-move Rule

### 🎨 UI/UX
- ดีไซน์สไตล์จีนมังกร สวยงามหรูหรา
- สีแดง-ทอง เป็นหลัก
- พื้นหลังลายมังกรแบบ SVG
- Responsive Design รองรับมือถือ
- Animation ลื่นไหล
- PWA ติดตั้งเป็นแอปได้

### ⏱️ ระบบเวลา
- 1+0 (Blitz)
- 3+0 (Blitz)
- 5+0 (Rapid)
- 10+0 (Rapid)
- 15+10 (Classical)
- 30+0 (Classical)
- 60+0 (Correspondence)

## 🚀 การติดตั้งและใช้งาน

### วิธีที่ 1: Deploy บนเครื่องตัวเอง

```bash
cd chess-online
npm install
npm start
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

### วิธีที่ 2: Deploy บน Render.com (ฟรี)

1. สร้างบัญชีที่ [Render](https://render.com)
2. สร้าง New Web Service
3. เชื่อมต่อกับ GitHub repository
4. ตั้งค่า:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node
5. Deploy!

### วิธีที่ 3: Deploy บน Railway.app (ฟรี)

1. สร้างบัญชีที่ [Railway](https://railway.app)
2. New Project → Deploy from GitHub
3. เลือก repository
4. Railway จะ detect package.json และ deploy อัตโนมัติ

### วิธีที่ 4: Deploy บน Vercel

```bash
npm i -g vercel
vercel
```

### วิธีที่ 5: Deploy บน GitHub Pages (โหมด Offline เท่านั้น)

1. ไปที่ Repository Settings → Pages
2. เลือก branch และ folder
3. Save

## 📱 ใช้งานบนมือถือ

เว็บไซต์รองรับ PWA (Progressive Web App):
1. เปิดเว็บใน Chrome หรือ Safari บนมือถือ
2. กดเมนู → "Add to Home Screen"
3. ไอคอนจะปรากฏบนหน้าจอหลัก
4. เปิดใช้งานได้เหมือนแอปปกติ

## 🎯 วิธีเล่นออนไลน์

### สร้างห้องเล่นกับเพื่อน
1. กด "สร้างห้องใหม่"
2. เลือกเวลาที่ต้องการ
3. คัดลอกรหัสห้องหรือลิงก์
4. ส่งให้เพื่อน
5. เพื่อนกด "เข้าร่วมห้อง" แล้วใส่รหัส
6. เริ่มเกม!

### สุ่มหาแมตช์
1. กด "สุ่มหาแมตช์"
2. เลือกเวลา
3. กด "เริ่มค้นหา"
4. รอระบบจับคู่
5. เริ่มเกมทันที!

## 🛠️ เทคโนโลยีที่ใช้

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Node.js, Express
- **Real-time:** Socket.IO
- **Styling:** Custom CSS with Chinese Dragon Theme
- **PWA:** Service Worker, Manifest

## 📂 โครงสร้างไฟล์

```
chess-online/
├── public/
│   ├── index.html          # หน้าหลัก
│   ├── styles.css          # สไตล์จีนมังกร
│   ├── chess.js            # เกมหมากรุกโลจิก
│   ├── online-client.js    # Socket.IO client
│   └── manifest.json       # PWA manifest
├── server.js               # Backend server
├── package.json            # Dependencies
└── README.md               # คู่มือนี้
```

## 🌐 การตั้งค่า Production

### Environment Variables
- `PORT`: Port ของเซิร์ฟเวอร์ (default: 3000)
- `NODE_ENV`: production/development

### SSL/HTTPS
สำหรับ production ควรใช้ HTTPS:
- ใช้ [Let's Encrypt](https://letsencrypt.org) สำหรับ SSL ฟรี
- หรือใช้ Cloudflare Proxy

### Domain
เชื่อมโดเมนเนมของคุณกับ hosting provider

## 🔧 การปรับแต่ง

### เปลี่ยนธีมสี
แก้ไข `styles.css`:
- `--primary-color`: สีหลัก (ปัจจุบัน: #C41E3A แดง)
- `--gold-color`: สีทอง (ปัจจุบัน: #D4AF37)
- `--bg-dark`: พื้นหลังเข้ม (ปัจจุบัน: #1a0a0a)

### เปลี่ยนภาษา
แก้ไขข้อความใน `index.html` และ `online-client.js`

## 📊 Scalability

สำหรับรองรับผู้เล่นจำนวนมาก:
1. ใช้ Redis สำหรับ Socket.IO adapter
2. Deploy หลาย instances พร้อม Load Balancer
3. ใช้ CDN สำหรับ static files
4. Optimize database (ถ้ามี)

## 🤝 การสนับสนุน

พบปัญหาหรือต้องการเพิ่มฟีเจอร์?
- แจ้งบั๊กผ่าน Issues
- ส่ง Pull Request
- ติดต่อผู้พัฒนา

## 📄 License

MIT License - ใช้งานได้อิสระ

## 🙏 ขอบคุณ

- Chess logic ดัดแปลงจากมาตรฐานสากล
- Icons จาก Unicode Chess Symbols
- Socket.IO สำหรับ real-time communication

---

**สนุกกับการเล่นหมากรุก!** 🎉♟️🐉
