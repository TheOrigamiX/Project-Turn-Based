// src/config/firebaseConfig.js
// ---------------------------------------------------------
// ตั้งค่าและเริ่มต้นการเชื่อมต่อ Firebase (SDK v10+ Modular Syntax)
// ไฟล์นี้มีหน้าที่เดียวคือ initialize Firebase App และ export
// instance ของ services ต่าง ๆ (auth, Firestore, Realtime DB)
// เพื่อให้ไฟล์อื่น import ไปใช้งานได้โดยไม่ต้อง initialize ซ้ำ
// ---------------------------------------------------------

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// TODO: แทนที่ค่าด้านล่างด้วยค่าจริงจาก Firebase Console
// ควรเก็บค่าที่ sensitive ไว้ใน environment variables (.env)
// แล้วใช้ผ่าน bundler เช่น Vite (import.meta.env.VITE_FIREBASE_API_KEY)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
  // จำเป็นสำหรับ Realtime Database โดยเฉพาะ (URL รูปแบบ https://<project>-default-rtdb.<region>.firebasedatabase.app)
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
};

// เริ่มต้น Firebase App (ควรมีเพียง instance เดียวทั้งแอป)
const app = initializeApp(firebaseConfig);

// Services ที่ใช้ทั่วทั้งโปรเจกต์
const auth = getAuth(app);          // สำหรับระบบ Authentication (login/register)
const db = getFirestore(app);       // Firestore: เก็บข้อมูลถาวร เช่น ตัวละคร, ไอเทม, EXP, Gold
const realtimeDb = getDatabase(app); // Realtime Database: เก็บข้อมูล state ของการต่อสู้แบบ real-time

export { app, auth, db, realtimeDb };
