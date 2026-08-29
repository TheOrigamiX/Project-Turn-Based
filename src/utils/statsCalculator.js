// src/utils/statsCalculator.js
// ---------------------------------------------------------
// รวมศูนย์การคำนวณค่าพลังทั้งหมดของตัวละคร (Single Source of Truth)
// รับข้อมูลผู้เล่น + ข้อมูล static (race/class/equipment) แล้วคืนค่า
// finalStats object ที่พร้อมใช้ในระบบต่อสู้
// ---------------------------------------------------------

/**
 * คำนวณค่าพลังสุดท้าย (finalStats) ของผู้เล่น 1 คน
 * @param {Object} playerData - ข้อมูลผู้เล่น เช่น
 *   {
 *     level, raceId, classId, baseStats: {STR,INT,DEX,VIT,AGI},
 *     equipped: { WEAPON, ARMOR, HELMET, ACCESSORY },
 *     buffs: [{ stat, value, duration }, ...]
 *   }
 * @param {Object} gameData - อ้างอิงจาก src/data/gameData.js (RACES, EQUIPMENT)
 * @param {Object} classData - อ้างอิงจาก src/data/classData.js (CLASS_DATA)
 * @returns {Object} finalStats
 */
export function calculateFinalStats(playerData, gameData, classData) {
  const { level, raceId, classId, baseStats, equipped = {}, buffs = [] } = playerData;

  const race = gameData.RACES[raceId];
  const charClass = classData[classId];

  if (!race || !charClass) {
    throw new Error(
      `calculateFinalStats: ไม่พบข้อมูล race (${raceId}) หรือ class (${classId})`
    );
  }

  // -----------------------------------------------------
  // 1) Primary Stats = (Base Stats × Class Multiplier × Level)
  //    + Race Bonus + Equipment Bonus
  // -----------------------------------------------------
  const primaryStatKeys = ["STR", "INT", "DEX", "VIT", "AGI"];
  const primaryStats = {};

  for (const key of primaryStatKeys) {
    const base = baseStats[key] || 0;
    const multiplier = charClass.statMultiplier[key] || 1;
    const raceBonus = race.statBonus[key] || 0;

    // เติบโตตาม Level: Base x Multiplier x (1 + growth ต่อเลเวล)
    let value = base * multiplier * (1 + (level - 1) * 0.05) + raceBonus;

    // รวมค่าจาก Equipment ทุกชิ้นที่ใส่อยู่
    for (const slot in equipped) {
      const item = equipped[slot];
      if (item && item.statBonus && item.statBonus[key]) {
        value += item.statBonus[key];
      }
    }

    // รวม Buff/Debuff ชั่วคราวที่มีผลต่อ stat นี้โดยตรง
    for (const buff of buffs) {
      if (buff.stat === key) {
        value += buff.value;
      }
    }

    primaryStats[key] = Math.round(value * 100) / 100;
  }

  // -----------------------------------------------------
  // 2) Derived Stats — คำนวณจาก Primary Stats
  // -----------------------------------------------------
  const maxHP = Math.round(primaryStats.VIT * 12 + level * 8);
  const maxMana = Math.round(primaryStats.INT * 8 + level * 4);
  const physicalATK = Math.round(primaryStats.STR * 2.2 + primaryStats.DEX * 0.5);
  const magicalATK = Math.round(primaryStats.INT * 2.5);

  // DEF: มาจาก VIT บวกกับ Armor ที่ใส่ (Equipment ARMOR/HELMET อาจมี defBonus โดยตรง)
  let defFromEquipment = 0;
  for (const slot in equipped) {
    const item = equipped[slot];
    if (item && item.statBonus && item.statBonus.DEF) {
      defFromEquipment += item.statBonus.DEF;
    }
  }
  const defense = Math.round(primaryStats.VIT * 0.8 + defFromEquipment);

  const speed = Math.round(primaryStats.AGI * 1.5);

  // Crit chance: มาจาก DEX, cap ไว้ที่ 60% กันสกิลบั๊ก
  let critChance = Math.min(0.05 + primaryStats.DEX * 0.002, 0.6);
  if (charClass.classPassive?.effect?.critChanceBonus) {
    critChance = Math.min(critChance + charClass.classPassive.effect.critChanceBonus, 0.6);
  }

  const finalStats = {
    level,
    primaryStats, // { STR, INT, DEX, VIT, AGI }
    maxHP,
    maxMana,
    physicalATK,
    magicalATK,
    defense,
    speed,
    critChance,
    updatedAt: Date.now(),
  };

  return finalStats;
}
