// src/managers/turnOrderManager.js
// ---------------------------------------------------------
// จัดการลำดับเทิร์น (Turn Order) ของการต่อสู้แบบ Turn-Based
// เก็บ state ไว้ใน Realtime Database ที่ path: battles/{roomCode}
// เนื่องจากต้องอัปเดตบ่อยและต้องการ latency ต่ำระหว่างผู้เล่น
// ---------------------------------------------------------

import { ref, get, set, update, onValue } from "firebase/database";
import { realtimeDb } from "../config/firebaseConfig.js";
import { processMonsterTurn } from "./monsterAIManager.js";

/**
 * คำนวณลำดับ Turn โดยเรียงตามค่า Speed (มากไปน้อย)
 * ใช้ตอนเริ่มการต่อสู้ครั้งแรก (initBattle)
 * @param {Array} combatants - array ของ { id, type: "PLAYER"|"MONSTER", speed, hp }
 * @param {string} roomCode
 */
export async function initTurnOrder(roomCode, combatants) {
  // เรียงลำดับตาม speed มาก -> น้อย, ถ้าเท่ากันสุ่มลำดับเพื่อความยุติธรรม
  const sorted = [...combatants].sort((a, b) => {
    if (b.speed !== a.speed) return b.speed - a.speed;
    return Math.random() - 0.5;
  });

  const turnQueue = sorted.map((c) => c.id);

  const battleRef = ref(realtimeDb, `battles/${roomCode}`);
  await update(battleRef, {
    turnQueue,
    currentTurnIndex: 0,
    currentTurn: turnQueue[0],
    combatants: sorted.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {}),
    status: "in_progress",
  });

  return turnQueue;
}

/**
 * สลับไปยังคิวถัดไปในลำดับ Turn
 * - ข้ามตัวละคร/มอนสเตอร์ที่ HP <= 0
 * - ถ้าเป็น Turn ของผู้เล่น: เปิดสิทธิ์ให้ส่ง action (currentTurn ชี้ไปที่ userId นั้น)
 * - ถ้าเป็น Turn ของมอนสเตอร์: เรียก AI ให้ประมวลผลอัตโนมัติ
 * @param {string} roomCode
 */
export async function nextTurn(roomCode) {
  const battleRef = ref(realtimeDb, `battles/${roomCode}`);
  const snapshot = await get(battleRef);

  if (!snapshot.exists()) {
    throw new Error(`nextTurn: ไม่พบข้อมูลการต่อสู้ roomCode=${roomCode}`);
  }

  const battle = snapshot.val();
  const { turnQueue, combatants } = battle;
  let { currentTurnIndex } = battle;

  // หา index ถัดไปที่ยังมีชีวิตอยู่ (HP > 0)
  let nextIndex = currentTurnIndex;
  let loopGuard = 0;

  do {
    nextIndex = (nextIndex + 1) % turnQueue.length;
    loopGuard++;
    if (loopGuard > turnQueue.length) {
      // ทุกตัวตายหมด ป้องกัน infinite loop — ให้ตรวจสอบสถานะด่านแทน
      await update(battleRef, { status: "ended" });
      return null;
    }
  } while (combatants[turnQueue[nextIndex]]?.hp <= 0);

  const nextCombatantId = turnQueue[nextIndex];
  const nextCombatant = combatants[nextCombatantId];

  await update(battleRef, {
    currentTurnIndex: nextIndex,
    currentTurn: nextCombatantId,
  });

  // ถ้าเป็นเทิร์นของมอนสเตอร์ ให้เรียก AI ประมวลผลอัตโนมัติทันที
  if (nextCombatant.type === "MONSTER") {
    await processMonsterTurn(roomCode, nextCombatantId);
  }

  return nextCombatantId;
}

/**
 * ดึงข้อมูล turn queue ปัจจุบัน (ใช้แสดงผล UI ลำดับเทิร์น)
 * @param {string} roomCode
 */
export async function getTurnQueue(roomCode) {
  const battleRef = ref(realtimeDb, `battles/${roomCode}/turnQueue`);
  const snapshot = await get(battleRef);
  return snapshot.exists() ? snapshot.val() : [];
}

/**
 * ติดตามข้อมูลการต่อสู้ทั้งหมดแบบ Realtime (สำหรับหน้า Battle UI)
 * @param {string} roomCode
 * @param {(battleData: Object|null) => void} callback
 * @returns {Function} unsubscribe
 */
export function listenToBattle(roomCode, callback) {
  const battleRef = ref(realtimeDb, `battles/${roomCode}`);
  return onValue(
    battleRef,
    (snapshot) => callback(snapshot.exists() ? snapshot.val() : null),
    (error) => console.error("listenToBattle error:", error)
  );
}
