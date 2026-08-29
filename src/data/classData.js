// src/data/classData.js
// ---------------------------------------------------------
// เก็บข้อมูล Static ของอาชีพ (Class) แต่ละอาชีพ
// - statMultiplier: อัตราคูณการเติบโตของค่าพลังในแต่ละ Level
// - allowedEquipment: slot/ประเภทอุปกรณ์ที่สวมใส่ได้
// - classSkills: สกิลประจำอาชีพ พร้อม Level ที่ปลดล็อก
// - classPassive: ความสามารถติดตัวประจำอาชีพ
// ---------------------------------------------------------

export const CLASS_DATA = {
  WARRIOR: {
    id: "WARRIOR",
    name: "Warrior",
    description: "นักรบแนวหน้า เน้นพลังโจมตีกายภาพและความอึด",
    // ตัวคูณนี้จะถูกนำไปคูณกับ Base Stat ของผู้เล่นตาม Level ใน statsCalculator.js
    statMultiplier: { STR: 1.5, INT: 0.5, DEX: 1.0, VIT: 1.4, AGI: 0.9 },
    allowedEquipment: ["WEAPON_SWORD", "WEAPON_AXE", "ARMOR", "HELMET", "ACCESSORY"],
    classSkills: [
      { skillId: "SLASH", unlockLevel: 1 },
      { skillId: "SHIELD_BASH", unlockLevel: 5 },
      { skillId: "WHIRLWIND", unlockLevel: 10 },
    ],
    classPassive: {
      id: "TAUNT_AURA",
      name: "Taunt Aura",
      description: "เพิ่มโอกาสถูกมอนสเตอร์เลือกเป็นเป้าหมาย 15% (ดึงดูดความสนใจ)",
      effect: { aggroMultiplier: 1.15 },
    },
  },

  MAGE: {
    id: "MAGE",
    name: "Mage",
    description: "นักเวทที่เชี่ยวชาญเวทมนตร์ทำลายล้างระยะไกล",
    statMultiplier: { STR: 0.4, INT: 1.6, DEX: 0.9, VIT: 0.7, AGI: 1.0 },
    allowedEquipment: ["WEAPON_STAFF", "WEAPON_WAND", "ARMOR", "HELMET", "ACCESSORY"],
    classSkills: [
      { skillId: "FIREBALL", unlockLevel: 1 },
      { skillId: "METEOR", unlockLevel: 8 },
    ],
    classPassive: {
      id: "ARCANE_MASTERY",
      name: "Arcane Mastery",
      description: "ลดการใช้ Mana ของสกิลทุกตัวลง 10%",
      effect: { manaCostReduction: 0.1 },
    },
  },

  ARCHER: {
    id: "ARCHER",
    name: "Archer",
    description: "นักธนูที่โจมตีแม่นยำและรวดเร็ว",
    statMultiplier: { STR: 0.9, INT: 0.6, DEX: 1.5, VIT: 0.9, AGI: 1.4 },
    allowedEquipment: ["WEAPON_BOW", "ARMOR", "HELMET", "ACCESSORY"],
    classSkills: [
      { skillId: "QUICK_SHOT", unlockLevel: 1 },
      { skillId: "MULTI_SHOT", unlockLevel: 6 },
    ],
    classPassive: {
      id: "EAGLE_EYE",
      name: "Eagle Eye",
      description: "เพิ่มโอกาส Critical Hit อีก 5%",
      effect: { critChanceBonus: 0.05 },
    },
  },

  CLERIC: {
    id: "CLERIC",
    name: "Cleric",
    description: "นักบวชผู้เยียวยา ฟื้นฟู HP และเสริมพลังให้ทีม",
    statMultiplier: { STR: 0.5, INT: 1.4, DEX: 0.7, VIT: 1.1, AGI: 0.9 },
    allowedEquipment: ["WEAPON_MACE", "WEAPON_STAFF", "ARMOR", "HELMET", "ACCESSORY"],
    classSkills: [
      { skillId: "HEAL", unlockLevel: 1 },
      { skillId: "BLESSING", unlockLevel: 4 },
      { skillId: "GROUP_HEAL", unlockLevel: 9 },
    ],
    classPassive: {
      id: "DIVINE_GRACE",
      name: "Divine Grace",
      description: "เพิ่มประสิทธิภาพการรักษา (Heal) ทั้งหมด 10%",
      effect: { healEffectivenessBonus: 0.1 },
    },
  },
};
