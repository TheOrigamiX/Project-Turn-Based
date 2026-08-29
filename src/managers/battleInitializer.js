// src/managers/battleInitializer.js
// ---------------------------------------------------------
// เชื่อมระหว่าง "ห้องปาร์ตี้" (coopLobbyManager) กับ "ระบบต่อสู้"
// (turnOrderManager) — แปลงข้อมูลสมาชิกในห้อง + เทมเพลตมอนสเตอร์ของด่าน
// ให้กลายเป็น combatants แล้วเริ่มต้นลำดับเทิร์นใน Realtime Database
// ---------------------------------------------------------

import { ref, set } from "firebase/database";
import { realtimeDb } from "../config/firebaseConfig.js";
import { STAGES, MONSTERS } from "../data/gameData.js";
import { initTurnOrder } from "./turnOrderManager.js";

/**
 * เริ่มการต่อสู้จากข้อมูลห้องปาร์ตี้ — ควรถูกเรียกโดย "host" เพียงคนเดียว
 * เมื่อสมาชิกทุกคนกด ready ครบแล้ว (coopLobbyManager จะเปลี่ยน room.status
 * เป็น "in_progress" โดยอัตโนมัติเมื่อ selectCharacter ครบทุกคน)
 * @param {string} roomCode
 * @param {Object} room - ข้อมูลห้องจาก Firestore (ต้องมี members[], stageId)
 */
export async function startBattleFromRoom(roomCode, room) {
  const stage = STAGES[room.stageId];
  if (!stage) {
    throw new Error(`startBattleFromRoom: ไม่พบด่าน stageId=${room.stageId}`);
  }

  // แปลงสมาชิกในห้องเป็น combatant ฝั่งผู้เล่น โดยอิงจาก finalStats ที่คำนวณไว้แล้ว
  const playerCombatants = room.members.map((member) => {
    const character = member.characterData;
    const stats = character.finalStats;

    return {
      id: member.userId,
      type: "PLAYER",
      name: character.displayName,
      level: character.level || 1,
      hp: stats.maxHP,
      maxHP: stats.maxHP,
      mana: stats.maxMana,
      maxMana: stats.maxMana,
      physicalATK: stats.physicalATK,
      magicalATK: stats.magicalATK,
      defense: stats.defense,
      speed: stats.speed,
      critChance: stats.critChance,
      race: character.raceId,
      classId: character.classId,
      cooldowns: {},
      buffs: [],
      // Warrior มี passive taunt aura -> เพิ่มโอกาสถูกมอนสเตอร์เลือกเป็นเป้าหมาย
      aggroMultiplier: character.classId === "WARRIOR" ? 1.15 : 1,
    };
  });

  // แปลงเทมเพลตมอนสเตอร์ของด่านเป็น combatant ฝั่งศัตรู (คนละ instance กัน แม้ชื่อซ้ำ)
  const monsterCombatants = stage.monsterTemplateIds.map((templateId, index) => {
    const template = MONSTERS[templateId];
    if (!template) {
      throw new Error(`startBattleFromRoom: ไม่พบมอนสเตอร์ templateId=${templateId}`);
    }
    return {
      ...template,
      id: `${templateId}_${index}`,
      hp: template.maxHP,
      mana: template.maxMana || 0,
      cooldowns: {},
      buffs: [],
    };
  });

  const allCombatants = [...playerCombatants, ...monsterCombatants];

  // initTurnOrder จะเรียงลำดับเทิร์นตาม Speed และบันทึกลง Realtime Database ให้เอง
  await initTurnOrder(roomCode, allCombatants);

  // เก็บ stageId ไว้ใน battle doc ด้วย เพื่อให้ lootManager รู้ว่าจะแจก loot ตารางไหน
  await set(ref(realtimeDb, `battles/${roomCode}/stageId`), room.stageId);

  return allCombatants;
}
