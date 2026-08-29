// src/utils/combatCalculator.js
// ---------------------------------------------------------
// คำนวณความเสียหาย (Damage) หรือการรักษา (Heal) ที่เกิดจากการใช้สกิล
// พิจารณา: ATK ผู้ใช้, DEF เป้าหมาย, Critical Hit, และการแพ้ทาง (element/race)
// ---------------------------------------------------------

// ตารางความสัมพันธ์ธาตุ/เผ่าที่ "แพ้ทาง" กัน (ตัวอย่าง — ปรับขยายได้)
// key = ธาตุของสกิล, value = เผ่า/ประเภทมอนสเตอร์ที่ได้รับความเสียหายเพิ่ม
const ELEMENT_WEAKNESS_TABLE = {
  FIRE: ["UNDEAD", "ICE"],
  HOLY: ["UNDEAD", "DEMON"],
  PHYSICAL_ORC_WEAK: ["ELF"], // ตัวอย่างการแพ้ทางเผ่า
};

const CRIT_DAMAGE_MULTIPLIER = 1.5;
const ELEMENT_WEAKNESS_MULTIPLIER = 1.3;

/**
 * คำนวณผลลัพธ์ของการใช้สกิล (damage หรือ heal)
 * @param {Object} params
 * @param {Object} params.skill - ข้อมูลสกิลจาก gameData.SKILLS
 * @param {Object} params.casterStats - finalStats ของผู้ใช้สกิล
 * @param {Object} params.targetStats - finalStats ของเป้าหมาย (มี defense, hp)
 * @param {string} [params.targetElement] - ธาตุ/ประเภทของเป้าหมาย (สำหรับเช็กแพ้ทาง)
 * @returns {Object} { type: "DAMAGE"|"HEAL"|"BUFF", value, isCrit, isWeaknessHit }
 */
export function calculateCombatResult({ skill, casterStats, targetStats, targetElement }) {
  // สกิลบัฟ/ไม่มี damageType เช่น Blessing -> คืนค่า buff โดยตรง ไม่ผ่านการคำนวณ dmg
  if (!skill.damageType && skill.targetType !== "ALLY" && skill.targetType !== "ALL_ALLY") {
    const buffResult = skill.formula(casterStats);
    return { type: "BUFF", ...buffResult, isCrit: false, isWeaknessHit: false };
  }

  // สกิล Heal (targetType ALLY/ALL_ALLY และไม่มี damageType เป็น "โจมตี" เชิงลบ)
  const isHealSkill = skill.id.includes("HEAL");
  const rawValue = skill.formula(casterStats);

  if (isHealSkill) {
    // Heal ไม่ต้องหัก defense, สามารถ crit ได้เหมือนกันเพื่อความสนุก
    const isCrit = Math.random() < casterStats.critChance;
    const healValue = Math.round(rawValue * (isCrit ? CRIT_DAMAGE_MULTIPLIER : 1));
    return { type: "HEAL", value: healValue, isCrit, isWeaknessHit: false };
  }

  // ---------- คำนวณ Damage ----------
  let damage = rawValue;

  // หัก Defense ของเป้าหมาย (ใช้สูตรลดทอนแบบ diminishing return กันค่า DEF สูงเกินจนภูมิคุ้มกัน)
  const defenseReduction = targetStats.defense / (targetStats.defense + 100);
  damage = damage * (1 - defenseReduction);

  // เช็ก Critical Hit
  const isCrit = Math.random() < casterStats.critChance;
  if (isCrit) {
    damage *= CRIT_DAMAGE_MULTIPLIER;
  }

  // เช็กการแพ้ทางธาตุ/เผ่า
  let isWeaknessHit = false;
  const skillElement = skill.element || skill.damageType; // fallback ถ้าไม่ได้กำหนด element เฉพาะ
  if (skillElement && targetElement && ELEMENT_WEAKNESS_TABLE[skillElement]?.includes(targetElement)) {
    damage *= ELEMENT_WEAKNESS_MULTIPLIER;
    isWeaknessHit = true;
  }

  // ป้องกันค่าติดลบหรือทศนิยมแปลก ๆ
  damage = Math.max(1, Math.round(damage));

  return { type: "DAMAGE", value: damage, isCrit, isWeaknessHit };
}
