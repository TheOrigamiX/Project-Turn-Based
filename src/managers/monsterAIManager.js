// src/managers/monsterAIManager.js
// ---------------------------------------------------------
// จัดการ AI ของมอนสเตอร์/Boss เมื่อถึงคิว Turn ของฝั่งศัตรู
// ทำงานอัตโนมัติ: เลือกเป้าหมาย, ใช้สกิลตาม Boss Pattern,
// อัปเดต HP ผู้เล่นใน Realtime Database แล้วเรียก nextTurn()
// ---------------------------------------------------------

import { ref, get, update, push, serverTimestamp } from "firebase/database";
import { realtimeDb } from "../config/firebaseConfig.js";
import { SKILLS } from "../data/gameData.js";
import { calculateCombatResult } from "../utils/combatCalculator.js";

/**
 * ประมวลผลเทิร์นของมอนสเตอร์ 1 ตัว
 * @param {string} roomCode
 * @param {string} monsterId
 *
 * หมายเหตุ: ฟังก์ชันนี้ "ไม่" เรียก nextTurn() เอง เพราะถูกเรียกมาจาก
 * turnOrderManager.nextTurn() อยู่แล้ว (ป้องกัน circular call วนซ้ำ)
 * แทนที่จะ import nextTurn กลับเข้ามา เราจะคืนค่าผลลัพธ์ให้ผู้เรียกจัดการต่อ
 * แต่เนื่องจากสเปกต้องการให้ตัวนี้เรียก nextTurn() ด้วย จึงใช้ dynamic import
 * เพื่อตัดปัญหา circular dependency แบบ static import
 */
export async function processMonsterTurn(roomCode, monsterId) {
  const battleRef = ref(realtimeDb, `battles/${roomCode}`);
  const snapshot = await get(battleRef);

  if (!snapshot.exists()) {
    throw new Error(`processMonsterTurn: ไม่พบข้อมูลการต่อสู้ roomCode=${roomCode}`);
  }

  const battle = snapshot.val();
  const monster = battle.combatants[monsterId];

  if (!monster || monster.hp <= 0) {
    // มอนสเตอร์ตายไปแล้ว ข้ามไปเทิร์นถัดไปเลย
    const { nextTurn } = await import("./turnOrderManager.js");
    return nextTurn(roomCode);
  }

  // 1) เลือกสกิลตาม Boss Pattern (ถ้าเป็น Boss และมี pattern ตาม HP threshold)
  const skillId = selectMonsterSkill(monster);
  const skill = SKILLS[skillId] || monster.basicAttack; // fallback ใช้ท่าโจมตีพื้นฐาน

  // 2) เลือกเป้าหมายผู้เล่น
  const alivePlayers = Object.values(battle.combatants).filter(
    (c) => c.type === "PLAYER" && c.hp > 0
  );

  if (alivePlayers.length === 0) {
    // ผู้เล่นตายหมดแล้ว ไม่ต้องทำอะไรต่อ (stageManager จะจับสถานะ Defeat)
    return null;
  }

  const target = selectTarget(monster, alivePlayers);

  // 3) คำนวณความเสียหาย
  const result = calculateCombatResult({
    skill,
    casterStats: monster,
    targetStats: target,
    targetElement: target.race, // เผ่าของผู้เล่นใช้เช็กแพ้ทางได้เช่นกัน
  });

  const updates = {};
  const logRef = ref(realtimeDb, `battles/${roomCode}/combatLog`);

  if (result.type === "DAMAGE") {
    const newHp = Math.max(0, target.hp - result.value);
    updates[`battles/${roomCode}/combatants/${target.id}/hp`] = newHp;

    await push(logRef, {
      message:
        `${monster.name} ใช้ ${skill.name} ใส่ ${target.name} ` +
        `สร้างความเสียหาย ${result.value}${result.isCrit ? " (CRIT!)" : ""}`,
      timestamp: serverTimestamp(),
    });
  }

  await update(ref(realtimeDb), updates);

  // 4) ไปยังเทิร์นถัดไป (dynamic import เพื่อตัด circular dependency)
  const { nextTurn } = await import("./turnOrderManager.js");
  return nextTurn(roomCode);
}

/**
 * เลือกสกิลของมอนสเตอร์ตาม Boss Pattern (เปลี่ยนท่าตาม % HP ที่เหลือ)
 * @param {Object} monster - ต้องมี field: hp, maxHP, skillPool (array), bossPatterns (optional)
 */
function selectMonsterSkill(monster) {
  const hpPercent = monster.hp / monster.maxHP;

  // Boss Pattern: ถ้ามี bossPatterns ให้เช็กจาก threshold สูงสุดที่ตรงเงื่อนไขก่อน
  if (monster.isBoss && Array.isArray(monster.bossPatterns)) {
    const sortedPatterns = [...monster.bossPatterns].sort(
      (a, b) => a.hpThreshold - b.hpThreshold
    );
    for (const pattern of sortedPatterns) {
      if (hpPercent <= pattern.hpThreshold) {
        return pattern.skillId; // เช่น HP < 50% ใช้สกิลหมู่ AoE
      }
    }
  }

  // มอนสเตอร์ทั่วไป: สุ่มสกิลจาก skillPool
  const pool = monster.skillPool || [];
  if (pool.length === 0) return null; // จะใช้ basicAttack แทน
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * เลือกเป้าหมายผู้เล่นตามพฤติกรรม AI
 * - ค่าเริ่มต้น: โจมตีผู้เล่นที่ HP เปอร์เซ็นต์ต่ำสุด (เน้นจบเกมเร็ว)
 * - ถ้ามีผู้เล่นที่ aggro สูง (เช่น Warrior ใช้ Taunt) ให้เล็งไปที่ตัวนั้นก่อน
 * @param {Object} monster
 * @param {Array} alivePlayers
 */
function selectTarget(monster, alivePlayers) {
  // เช็ก Aggro ก่อน (ตัวละครที่มี aggroMultiplier สูงกว่า มีโอกาสถูกเลือกมากกว่า)
  const highAggroPlayers = alivePlayers.filter((p) => p.aggroMultiplier > 1);
  const candidatePool = highAggroPlayers.length > 0 ? highAggroPlayers : alivePlayers;

  // เลือกผู้เล่นที่ HP% ต่ำสุดในกลุ่มเป้าหมาย (เน้นตัวที่ใกล้ตายเพื่อจบเกมเร็ว)
  return candidatePool.reduce((lowest, current) => {
    const lowestPercent = lowest.hp / lowest.maxHP;
    const currentPercent = current.hp / current.maxHP;
    return currentPercent < lowestPercent ? current : lowest;
  }, candidatePool[0]);
}
