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
  apiKey: "AIzaSyBN6EVvSc7i5gTXhCSFxVEtDA5jRaDtctc",
  authDomain: "project-tb-47344.firebaseapp.com",
  databaseURL: "https://project-tb-47344-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "project-tb-47344",
  storageBucket: "project-tb-47344.firebasestorage.app",
  messagingSenderId: "270857150017",
  appId: "1:270857150017:web:c1b29c88358c616b06f0c0",
  measurementId: "G-Q8R8G0HXV8"
};

// เริ่มต้น Firebase App (ควรมีเพียง instance เดียวทั้งแอป)
const app = initializeApp(firebaseConfig);

// Services ที่ใช้ทั่วทั้งโปรเจกต์
const auth = getAuth(app);          // สำหรับระบบ Authentication (login/register)
const db = getFirestore(app);       // Firestore: เก็บข้อมูลถาวร เช่น ตัวละคร, ไอเทม, EXP, Gold
const realtimeDb = getDatabase(app); // Realtime Database: เก็บข้อมูล state ของการต่อสู้แบบ real-time

export { app, auth, db, realtimeDb };
