// src/managers/playerActionHandler.js
// ---------------------------------------------------------
// รับคำสั่ง Action จากผู้เล่น (ใช้สกิล/โจมตี) ตรวจสอบความถูกต้อง
// คำนวณผลลัพธ์ผ่าน combatCalculator แล้วอัปเดต HP/Mana/Cooldown
// ลงใน Realtime Database พร้อมบันทึก Combat Log ให้ทุกคนเห็น
// ---------------------------------------------------------

import { ref, get, update, push, serverTimestamp } from "firebase/database";
import { realtimeDb } from "../config/firebaseConfig.js";
import { SKILLS } from "../data/gameData.js";
import { calculateCombatResult } from "../utils/combatCalculator.js";
import { nextTurn } from "./turnOrderManager.js";

/**
 * ประมวลผล Action ของผู้เล่น: ใช้สกิลใส่เป้าหมาย (หรือหลายเป้าหมายถ้าเป็น AOE)
 * @param {string} roomCode
 * @param {string} playerId - userId ของผู้ส่ง action
 * @param {string} skillId
 * @param {string|string[]} targetIds - เป้าหมาย 1 หรือหลายคน (AOE)
 */
export async function handlePlayerAction(roomCode, playerId, skillId, targetIds) {
  const battleRef = ref(realtimeDb, `battles/${roomCode}`);
  const snapshot = await get(battleRef);

  if (!snapshot.exists()) {
    throw new Error(`handlePlayerAction: ไม่พบข้อมูลการต่อสู้ roomCode=${roomCode}`);
  }

  const battle = snapshot.val();

  // 1) ตรวจสอบว่าเป็นเทิร์นของผู้เล่นคนนี้จริงหรือไม่ (กันการโกงส่ง action นอกเทิร์น)
  if (battle.currentTurn !== playerId) {
    throw new Error("handlePlayerAction: ยังไม่ใช่เทิร์นของผู้เล่นนี้");
  }

  const caster = battle.combatants[playerId];
  if (!caster || caster.hp <= 0) {
    throw new Error("handlePlayerAction: ผู้เล่นนี้ไม่สามารถกระทำการได้ (HP หมด)");
  }

  const skill = SKILLS[skillId];
  if (!skill) {
    throw new Error(`handlePlayerAction: ไม่พบสกิล skillId=${skillId}`);
  }

  // 2) ตรวจสอบ Cooldown
  const cooldowns = caster.cooldowns || {};
  if (cooldowns[skillId] && cooldowns[skillId] > 0) {
    throw new Error(`handlePlayerAction: สกิล ${skill.name} ยังติด Cooldown อีก ${cooldowns[skillId]} เทิร์น`);
  }

  // 3) ตรวจสอบ Mana เพียงพอ
  if (caster.mana < skill.manaCost) {
    throw new Error("handlePlayerAction: Mana ไม่เพียงพอ");
  }

  // 4) กำหนดรายชื่อเป้าหมายจริง (รองรับ AOE / ALL_ALLY)
  let resolvedTargetIds = [];
  if (skill.targetType === "AOE") {
    resolvedTargetIds = Object.values(battle.combatants)
      .filter((c) => c.type === "MONSTER" && c.hp > 0)
      .map((c) => c.id);
  } else if (skill.targetType === "ALL_ALLY") {
    resolvedTargetIds = Object.values(battle.combatants)
      .filter((c) => c.type === "PLAYER" && c.hp > 0)
      .map((c) => c.id);
  } else {
    resolvedTargetIds = Array.isArray(targetIds) ? targetIds : [targetIds];
  }

  const updates = {};
  const logMessages = [];

  for (const targetId of resolvedTargetIds) {
    const target = battle.combatants[targetId];
    if (!target || target.hp <= 0) continue;

    const result = calculateCombatResult({
      skill,
      casterStats: caster,
      targetStats: target,
      targetElement: target.element,
    });

    if (result.type === "DAMAGE") {
      const newHp = Math.max(0, target.hp - result.value);
      updates[`battles/${roomCode}/combatants/${targetId}/hp`] = newHp;
      logMessages.push(
        `${caster.name} ใช้ ${skill.name} ใส่ ${target.name} ` +
          `สร้างความเสียหาย ${result.value}${result.isCrit ? " (CRIT!)" : ""}` +
          `${result.isWeaknessHit ? " (จุดอ่อน!)" : ""}`
      );
    } else if (result.type === "HEAL") {
      const newHp = Math.min(target.maxHP, target.hp + result.value);
      updates[`battles/${roomCode}/combatants/${targetId}/hp`] = newHp;
      logMessages.push(`${caster.name} ใช้ ${skill.name} รักษา ${target.name} +${result.value} HP`);
    } else if (result.type === "BUFF") {
      const existingBuffs = target.buffs || [];
      updates[`battles/${roomCode}/combatants/${targetId}/buffs`] = [
        ...existingBuffs,
        { stat: result.buff, value: result.value, duration: result.duration },
      ];
      logMessages.push(`${caster.name} ใช้ ${skill.name} เสริมพลังให้ ${target.name}`);
    }
  }

  // 5) หัก Mana และตั้ง Cooldown ให้ผู้ใช้สกิล
  updates[`battles/${roomCode}/combatants/${playerId}/mana`] = caster.mana - skill.manaCost;
  updates[`battles/${roomCode}/combatants/${playerId}/cooldowns/${skillId}`] = skill.cooldown;

  await update(ref(realtimeDb), updates);

  // 6) บันทึก Combat Log ให้ทุกคนเห็นพร้อมกัน (real-time)
  const logRef = ref(realtimeDb, `battles/${roomCode}/combatLog`);
  for (const message of logMessages) {
    await push(logRef, { message, timestamp: serverTimestamp() });
  }

  // 7) ไปยังเทิร์นถัดไป
  const next = await nextTurn(roomCode);

  return { logMessages, nextTurn: next };
}
