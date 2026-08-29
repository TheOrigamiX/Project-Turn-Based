// src/managers/stageManager.js
// ---------------------------------------------------------
// ตรวจสอบสถานะของด่าน (Stage) หลังจากทุก ๆ Action ในการต่อสู้
// เพื่อดูว่าเกิดเงื่อนไข Victory (มอนสเตอร์ตายหมด) หรือ
// Defeat (ผู้เล่นตายหมด) หรือยัง
// ---------------------------------------------------------

import { ref, get, update, serverTimestamp } from "firebase/database";
import { realtimeDb } from "../config/firebaseConfig.js";
import { distributeLoot } from "./lootManager.js";

/**
 * ตรวจสอบสถานะปัจจุบันของด่าน
 * ควรถูกเรียกหลังจากทุกครั้งที่มีการอัปเดต HP ของ combatants (player action / monster turn)
 * @param {string} roomCode
 * @returns {Promise<"IN_PROGRESS"|"VICTORY"|"DEFEAT">}
 */
export async function checkStageStatus(roomCode) {
  const battleRef = ref(realtimeDb, `battles/${roomCode}`);
  const snapshot = await get(battleRef);

  if (!snapshot.exists()) {
    throw new Error(`checkStageStatus: ไม่พบข้อมูลการต่อสู้ roomCode=${roomCode}`);
  }

  const battle = snapshot.val();
  const combatants = Object.values(battle.combatants || {});

  const monsters = combatants.filter((c) => c.type === "MONSTER");
  const players = combatants.filter((c) => c.type === "PLAYER");

  const allMonstersDead = monsters.length > 0 && monsters.every((m) => m.hp <= 0);
  const allPlayersDead = players.length > 0 && players.every((p) => p.hp <= 0);

  if (allMonstersDead) {
    await update(battleRef, { status: "victory", endedAt: serverTimestamp() });

    // แจกรางวัลให้ทีมทันทีที่ชนะ
    const survivingPlayerIds = players.map((p) => p.id);
    await distributeLoot(roomCode, survivingPlayerIds, battle.stageId);

    return "VICTORY";
  }

  if (allPlayersDead) {
    await update(battleRef, { status: "defeat", endedAt: serverTimestamp() });
    return "DEFEAT";
  }

  return "IN_PROGRESS";
}
