# RPG Co-op Turn-Based Multiplayer (PvE)

เกม RPG ต่อสู้แบบร่วมมือกัน (Co-op) ผ่านเบราว์เซอร์ ใช้ JavaScript ES6 Modules
เชื่อมต่อกับ Firebase (Firestore + Realtime Database)

## โครงสร้างโปรเจกต์

```
rpg-coop-game/
├── src/
│   ├── config/
│   │   └── firebaseConfig.js      # ตั้งค่าและ initialize Firebase SDK
│   ├── data/
│   │   ├── gameData.js            # RACES, SKILLS, EQUIPMENT (static data)
│   │   └── classData.js           # ข้อมูลอาชีพ (Warrior/Mage/Archer/Cleric)
│   ├── utils/
│   │   ├── statsCalculator.js     # คำนวณ finalStats ของตัวละคร
│   │   └── combatCalculator.js    # คำนวณ damage/heal ในการต่อสู้
│   └── managers/
│       ├── inventoryManager.js    # สวมใส่/ถอดอุปกรณ์ (Firestore)
│       ├── coopLobbyManager.js    # สร้าง/เข้าร่วมห้องปาร์ตี้
│       ├── turnOrderManager.js    # จัดลำดับเทิร์นการต่อสู้ (Realtime DB)
│       ├── playerActionHandler.js # รับ action ใช้สกิล/โจมตีจากผู้เล่น
│       ├── monsterAIManager.js    # AI มอนสเตอร์/Boss Pattern
│       ├── stageManager.js        # เช็ค Victory/Defeat
│       └── lootManager.js         # แจก EXP/Gold/ไอเทมหลังชนะ
│   └── ui/
│       ├── style.css              # Design tokens และสไตล์ทั้งหมด ("Emberfall" theme)
│       ├── loginView.js           # หน้าสร้างตัวละคร (ชื่อ/เผ่า/อาชีพ)
│       ├── lobbyView.js           # หน้าสร้าง/เข้าร่วมห้อง + รอสมาชิกพร้อม
│       └── battleView.js          # หน้าต่อสู้ (turn banner, HP/MP, สกิล, combat log)
├── src/main.js                    # Entry point — router สลับหน้า login/lobby/battle
├── index.html                     # HTML entry สำหรับ Vite
├── rules/
│   ├── firestore.rules            # Security rules ของ Firestore
│   └── database.rules.json        # Security rules ของ Realtime Database
├── package.json
└── README.md
```

## แนวคิดสำคัญของสถาปัตยกรรม

1. **Single Responsibility Principle** — แต่ละไฟล์รับผิดชอบหน้าที่เดียว:
   ข้อมูล static (`data/`), การคำนวณล้วน ๆ ไม่มี side-effect (`utils/`),
   และการเชื่อมต่อ Firebase / business logic (`managers/`)

2. **Firestore vs Realtime Database** — ใช้ Firestore เก็บข้อมูลที่ไม่ได้เปลี่ยนบ่อย
   (ตัวละคร, inventory, ห้องปาร์ตี้ก่อนเริ่มเกม) และใช้ Realtime Database
   เก็บ state ของการต่อสู้ที่ต้องอัปเดตถี่และ latency ต่ำ (HP, เทิร์น, combat log)

3. **Server-trusted logic** — ฟังก์ชันที่กระทบค่าที่มีผลต่อความยุติธรรมของเกม
   (gold, exp, HP ทีมศัตรู) ควรถูกย้ายไปรันบน **Cloud Functions** ในโปรดักชันจริง
   โค้ดในไฟล์ manager ที่ให้ไว้นี้เขียนในรูปแบบที่ย้ายไปรันบน Cloud Functions ได้ทันที
   (ไม่มี dependency กับ DOM/window) — ปัจจุบันตัวอย่างเรียกจาก client โดยตรงเพื่อความง่ายต่อการทดสอบ

4. **Security Rules** — ไฟล์ `rules/` ป้องกันไม่ให้ผู้เล่นแก้ไขค่า gold/exp/finalStats
   หรือส่ง action นอกเทิร์นของตัวเองได้โดยตรงจาก client SDK

## เริ่มต้นใช้งาน

### 1) ตั้งค่า Firebase Console
1. สร้างโปรเจกต์ใหม่ที่ https://console.firebase.google.com
2. เปิดใช้งาน **Authentication → Sign-in method → Anonymous**
3. สร้าง **Firestore Database** (โหมด production หรือ test ก็ได้ตอน dev)
4. สร้าง **Realtime Database** (เลือก region ที่ใกล้ผู้เล่นที่สุด)
5. คัดลอกค่า config จาก Project Settings → General → Your apps → Web app

### 2) ตั้งค่า environment variables
สร้างไฟล์ `.env` ที่ root ของโปรเจกต์:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_DATABASE_URL=https://<project-id>-default-rtdb.<region>.firebasedatabase.app
```

### 3) รันโปรเจกต์
```bash
npm install
npm run dev
```
เปิด `http://localhost:5173` — จะเห็นหน้า **สร้างตัวละคร** ทันที

### 4) ทดสอบโหมด Co-op
เปิด 2 แท็บ (หรือ incognito อีกอัน) สร้างตัวละคร 2 ตัว แท็บแรกกด **สร้างห้องปาร์ตี้**
แล้วนำรหัสห้อง 6 หลักไปกรอกในแท็บที่สองที่ **เข้าร่วมห้อง** จากนั้นทั้งสองฝั่งกด
**พร้อมออกรบ** เกมจะเข้าสู่หน้าต่อสู้โดยอัตโนมัติ

## Deploy เป็นเว็บจริง (GitHub + Vercel/Netlify แนะนำที่สุด)
1. `git init && git add . && git commit -m "init"` แล้ว push ขึ้น GitHub
2. เชื่อม repo กับ Vercel หรือ Netlify (build command: `npm run build`, output: `dist`)
3. ใส่ environment variables ชุดเดียวกับ `.env` ในหน้า settings ของ Vercel/Netlify
4. Deploy — ได้ URL ใช้งานจริงทันที (SPA + Firebase ทำงานได้เต็มรูปแบบบน static hosting)

> ถ้าต้องการใช้ GitHub Pages แทน ให้รัน `npm run build` แล้ว push โฟลเดอร์ `dist/`
> ไปที่ branch `gh-pages` (หรือใช้ GitHub Actions ตั้ง workflow build+deploy อัตโนมัติ)
> — GitHub Pages ไม่รองรับ environment variables ตอน build ฝั่ง server ดังนั้นต้อง
> build ในเครื่องหรือใน CI ที่ตั้งค่า secret ไว้ก่อน

## หมายเหตุการพัฒนาต่อ

- **Cooldown ยังไม่ลดอัตโนมัติทุกเทิร์น** — ตอนนี้ `playerActionHandler.js` ตั้ง cooldown
  ตอนใช้สกิลเท่านั้น ควรเพิ่ม logic ลด cooldown ทุกตัวละคร -1 ทุกครั้งที่ครบรอบเทิร์นของมันเอง
- ขยาย `STAGE_LOOT_TABLE` ใน `lootManager.js` และ `STAGES`/`MONSTERS` ใน `gameData.js`
  ให้ครอบคลุมทุกด่าน หรือย้ายไปเก็บใน Firestore เพื่อแก้ไขโดยไม่ต้อง deploy โค้ดใหม่
- เพิ่ม Cloud Functions สำหรับ logic ที่ต้องการความปลอดภัยสูง (แจกรางวัล, คำนวณ damage,
  เปลี่ยนเทิร์น) แทนการรันจาก client โดยตรง เพื่อให้ Security Rules บังคับใช้ได้สมบูรณ์
- เพิ่มระบบ inventory/equip UI (ปัจจุบัน `inventoryManager.js` พร้อมใช้งานแล้วแต่ยังไม่มีหน้าจอ)
