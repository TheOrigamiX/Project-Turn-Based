// src/managers/authManager.js
// ---------------------------------------------------------
// จัดการการล็อกอินของผู้เล่นและการสร้างเอกสารผู้เล่นเริ่มต้นใน Firestore
// ใช้ Firebase Anonymous Auth เพื่อให้เริ่มเล่นได้ทันทีโดยไม่ต้องสมัคร
// สมาชิก (เหมาะกับ demo/prototype — โปรดักชันจริงควรเพิ่ม email/social login)
// ---------------------------------------------------------

import { signInAnonymously, onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig.js";
import { calculateFinalStats } from "../utils/statsCalculator.js";
import { RACES, EQUIPMENT } from "../data/gameData.js";
import { CLASS_DATA } from "../data/classData.js";

const gameData = { RACES, EQUIPMENT };

// ค่าตั้งต้นของ Base Stats — เท่ากันทุกอาชีพ ความแตกต่างมาจาก statMultiplier ของแต่ละ class
const STARTING_BASE_STATS = { STR: 10, INT: 10, DEX: 10, VIT: 10, AGI: 10 };

/**
 * ล็อกอินแบบ Anonymous แล้วสร้างตัวละคร (ถ้ายังไม่มีเอกสารผู้เล่น)
 * @param {Object} params
 * @param {string} params.displayName - ชื่อที่ผู้เล่นตั้ง
 * @param {string} params.raceId - key ใน RACES เช่น "HUMAN"
 * @param {string} params.classId - key ใน CLASS_DATA เช่น "WARRIOR"
 * @returns {Promise<Object>} playerData ที่บันทึกลง Firestore
 */
export async function loginAndCreateCharacter({ displayName, raceId, classId }) {
  const credential = await signInAnonymously(auth);
  const uid = credential.user.uid;

  await updateProfile(credential.user, { displayName });

  const playerRef = doc(db, "players", uid);
  const existing = await getDoc(playerRef);

  if (existing.exists()) {
    return existing.data();
  }

  const finalStats = calculateFinalStats(
    {
      level: 1,
      raceId,
      classId,
      baseStats: STARTING_BASE_STATS,
      equipped: {},
      buffs: [],
    },
    gameData,
    CLASS_DATA
  );

  const playerData = {
    uid,
    displayName,
    raceId,
    classId,
    level: 1,
    exp: 0,
    gold: 0,
    baseStats: STARTING_BASE_STATS,
    inventory: { items: [], equipped: {} },
    buffs: [],
    finalStats,
    createdAt: serverTimestamp(),
  };

  await setDoc(playerRef, playerData);
  return playerData;
}

/**
 * ดึงข้อมูลผู้เล่นปัจจุบันจาก Firestore
 * @param {string} uid
 */
export async function fetchPlayerData(uid) {
  const playerRef = doc(db, "players", uid);
  const snapshot = await getDoc(playerRef);
  return snapshot.exists() ? snapshot.data() : null;
}

/**
 * ติดตามสถานะการล็อกอิน (สำหรับ restore session ตอนโหลดหน้าเว็บใหม่)
 * @param {(user: import("firebase/auth").User | null) => void} callback
 * @returns {Function} unsubscribe
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
