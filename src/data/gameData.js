// src/data/gameData.js
// ---------------------------------------------------------
// เก็บข้อมูล Static ของเกม: เผ่า (Races), สกิล (Skills),
// และอุปกรณ์ (Equipment) ทั้งหมดอยู่ในไฟล์เดียวเพื่อให้ง่าย
// ต่อการอ้างอิงข้าม module อื่น ๆ (import ได้จากที่เดียว)
// ---------------------------------------------------------

// ===========================================================
// 1) RACES — เผ่าต่าง ๆ พร้อม Base Stat Bonus และ Passive
// ===========================================================
export const RACES = {
  HUMAN: {
    id: "HUMAN",
    name: "Human",
    description: "เผ่าที่สมดุลในทุกด้าน ปรับตัวได้ดีกับทุกอาชีพ",
    statBonus: { STR: 2, INT: 2, DEX: 2, VIT: 2, AGI: 2 },
    passive: {
      id: "ADAPTABILITY",
      name: "Adaptability",
      description: "ได้รับ EXP เพิ่มขึ้น 5%",
      effect: { expMultiplier: 1.05 },
    },
  },
  ELF: {
    id: "ELF",
    name: "Elf",
    description: "เผ่าที่เชี่ยวชาญเวทมนตร์และความคล่องแคล่ว",
    statBonus: { STR: 0, INT: 5, DEX: 3, VIT: 0, AGI: 4 },
    passive: {
      id: "MANA_AFFINITY",
      name: "Mana Affinity",
      description: "ฟื้นฟู Mana เพิ่มขึ้น 10% ทุกเทิร์น",
      effect: { manaRegenMultiplier: 1.1 },
    },
  },
  ORC: {
    id: "ORC",
    name: "Orc",
    description: "เผ่านักรบร่างกำยำ พลังโจมตีสูง",
    statBonus: { STR: 6, INT: -2, DEX: 1, VIT: 4, AGI: -1 },
    passive: {
      id: "BERSERKER_BLOOD",
      name: "Berserker Blood",
      description: "เพิ่มความเสียหายกายภาพ 8% เมื่อ HP ต่ำกว่า 30%",
      effect: { lowHpPhysicalDamageMultiplier: 1.08, threshold: 0.3 },
    },
  },
  DWARF: {
    id: "DWARF",
    name: "Dwarf",
    description: "เผ่าที่แข็งแกร่งและอึด ทนทานต่อการโจมตี",
    statBonus: { STR: 3, INT: -1, DEX: 0, VIT: 6, AGI: -2 },
    passive: {
      id: "STONE_SKIN",
      name: "Stone Skin",
      description: "ลดความเสียหายกายภาพที่ได้รับ 5%",
      effect: { physicalDamageReduction: 0.05 },
    },
  },
};

// ===========================================================
// 2) SKILLS — สกิล Active/Passive พร้อมสูตรคำนวณ
// ===========================================================
// damageType: "PHYSICAL" | "MAGICAL"
// targetType: "SINGLE" | "AOE" | "SELF" | "ALLY" | "ALL_ALLY"
// formula: ฟังก์ชันคำนวณค่า damage/heal โดยรับ caster stats เป็น argument
export const SKILLS = {
  // ---------- Warrior ----------
  SLASH: {
    id: "SLASH",
    name: "Slash",
    type: "ACTIVE",
    damageType: "PHYSICAL",
    targetType: "SINGLE",
    manaCost: 5,
    cooldown: 0,
    description: "โจมตีฟันเดี่ยวใส่ศัตรู 1 เป้าหมาย",
    formula: (casterStats) => casterStats.physicalATK * 1.2,
  },
  SHIELD_BASH: {
    id: "SHIELD_BASH",
    name: "Shield Bash",
    type: "ACTIVE",
    damageType: "PHYSICAL",
    targetType: "SINGLE",
    manaCost: 10,
    cooldown: 2,
    description: "กระแทกโล่ สร้างความเสียหายและมีโอกาส Stun",
    formula: (casterStats) => casterStats.physicalATK * 0.8,
  },
  WHIRLWIND: {
    id: "WHIRLWIND",
    name: "Whirlwind",
    type: "ACTIVE",
    damageType: "PHYSICAL",
    targetType: "AOE",
    manaCost: 20,
    cooldown: 3,
    description: "หมุนอาวุธโจมตีศัตรูทุกตัว",
    formula: (casterStats) => casterStats.physicalATK * 0.7,
  },

  // ---------- Mage ----------
  FIREBALL: {
    id: "FIREBALL",
    name: "Fireball",
    type: "ACTIVE",
    damageType: "MAGICAL",
    targetType: "SINGLE",
    manaCost: 15,
    cooldown: 1,
    description: "ยิงลูกไฟใส่ศัตรู 1 เป้าหมาย",
    formula: (casterStats) => casterStats.magicalATK * 1.5,
  },
  METEOR: {
    id: "METEOR",
    name: "Meteor",
    type: "ACTIVE",
    damageType: "MAGICAL",
    targetType: "AOE",
    manaCost: 35,
    cooldown: 4,
    description: "เรียกอุกกาบาตถล่มศัตรูทุกตัว",
    formula: (casterStats) => casterStats.magicalATK * 1.1,
  },

  // ---------- Archer ----------
  QUICK_SHOT: {
    id: "QUICK_SHOT",
    name: "Quick Shot",
    type: "ACTIVE",
    damageType: "PHYSICAL",
    targetType: "SINGLE",
    manaCost: 5,
    cooldown: 0,
    description: "ยิงธนูโจมตีเร็วใส่เป้าหมายเดียว",
    formula: (casterStats) => casterStats.physicalATK * 1.1,
  },
  MULTI_SHOT: {
    id: "MULTI_SHOT",
    name: "Multi Shot",
    type: "ACTIVE",
    damageType: "PHYSICAL",
    targetType: "AOE",
    manaCost: 18,
    cooldown: 2,
    description: "ยิงธนูหลายดอกพร้อมกันใส่ศัตรูทุกตัว",
    formula: (casterStats) => casterStats.physicalATK * 0.6,
  },

  // ---------- Cleric ----------
  HEAL: {
    id: "HEAL",
    name: "Heal",
    type: "ACTIVE",
    damageType: "MAGICAL",
    targetType: "ALLY",
    manaCost: 12,
    cooldown: 0,
    description: "รักษา HP ให้เพื่อนร่วมทีม 1 คน",
    formula: (casterStats) => casterStats.magicalATK * 1.3, // ใช้เป็นค่า heal
  },
  GROUP_HEAL: {
    id: "GROUP_HEAL",
    name: "Group Heal",
    type: "ACTIVE",
    damageType: "MAGICAL",
    targetType: "ALL_ALLY",
    manaCost: 30,
    cooldown: 3,
    description: "รักษา HP ให้เพื่อนร่วมทีมทั้งหมด",
    formula: (casterStats) => casterStats.magicalATK * 0.8,
  },
  BLESSING: {
    id: "BLESSING",
    name: "Blessing",
    type: "ACTIVE",
    damageType: null,
    targetType: "ALLY",
    manaCost: 15,
    cooldown: 4,
    description: "เพิ่มค่า DEF ให้เป้าหมาย 20% เป็นเวลา 3 เทิร์น",
    formula: () => ({ buff: "DEF_UP", value: 0.2, duration: 3 }),
  },

  // ---------- Monster / Boss skills ----------
  ROOT_SLAM: {
    id: "ROOT_SLAM",
    name: "Root Slam",
    type: "ACTIVE",
    damageType: "PHYSICAL",
    targetType: "SINGLE",
    manaCost: 0,
    cooldown: 0,
    description: "ฟาดรากไม้ยักษ์ใส่เป้าหมายเดียว",
    formula: (casterStats) => casterStats.physicalATK * 1.1,
  },
  ENTANGLING_VINES: {
    id: "ENTANGLING_VINES",
    name: "Entangling Vines",
    type: "ACTIVE",
    damageType: "PHYSICAL",
    targetType: "AOE",
    manaCost: 0,
    cooldown: 0,
    description: "เถาวัลย์รัดตัวผู้เล่นทุกคน (ใช้เมื่อ HP ต่ำ)",
    formula: (casterStats) => casterStats.physicalATK * 0.75,
  },
};

// ===========================================================
// 4) MONSTERS — เทมเพลตมอนสเตอร์/Boss สำหรับใช้สร้าง combatant ใน battle
// ===========================================================
export const MONSTERS = {
  FOREST_SLIME: {
    templateId: "FOREST_SLIME",
    name: "Forest Slime",
    type: "MONSTER",
    maxHP: 60,
    maxMana: 0,
    physicalATK: 10,
    magicalATK: 0,
    defense: 5,
    speed: 8,
    critChance: 0.05,
    element: "NATURE",
    race: "SLIME",
    isBoss: false,
    skillPool: [],
    basicAttack: {
      id: "SLIME_HIT",
      name: "Slime Hit",
      damageType: "PHYSICAL",
      targetType: "SINGLE",
      manaCost: 0,
      cooldown: 0,
      formula: (c) => c.physicalATK * 0.9,
    },
  },
  GOBLIN_ARCHER: {
    templateId: "GOBLIN_ARCHER",
    name: "Goblin Archer",
    type: "MONSTER",
    maxHP: 45,
    maxMana: 0,
    physicalATK: 14,
    magicalATK: 0,
    defense: 3,
    speed: 12,
    critChance: 0.1,
    element: "NATURE",
    race: "GOBLIN",
    isBoss: false,
    skillPool: [],
    basicAttack: {
      id: "ARROW_SHOT",
      name: "Arrow Shot",
      damageType: "PHYSICAL",
      targetType: "SINGLE",
      manaCost: 0,
      cooldown: 0,
      formula: (c) => c.physicalATK * 1.0,
    },
  },
  ANCIENT_TREANT: {
    templateId: "ANCIENT_TREANT",
    name: "Ancient Treant",
    type: "MONSTER",
    maxHP: 400,
    maxMana: 0,
    physicalATK: 25,
    magicalATK: 15,
    defense: 15,
    speed: 6,
    critChance: 0.05,
    element: "NATURE",
    race: "TREANT",
    isBoss: true,
    skillPool: ["ROOT_SLAM"],
    // Boss Pattern: ใช้ ENTANGLING_VINES (AOE) เมื่อ HP <= 50%
    bossPatterns: [
      { hpThreshold: 1.0, skillId: "ROOT_SLAM" },
      { hpThreshold: 0.5, skillId: "ENTANGLING_VINES" },
    ],
    basicAttack: {
      id: "BRANCH_SWIPE",
      name: "Branch Swipe",
      damageType: "PHYSICAL",
      targetType: "SINGLE",
      manaCost: 0,
      cooldown: 0,
      formula: (c) => c.physicalATK * 1.0,
    },
  },
};

// ===========================================================
// 5) STAGES — ด่านต่าง ๆ พร้อมรายชื่อมอนสเตอร์ที่จะเจอ
// ===========================================================
export const STAGES = {
  STAGE_1: {
    id: "STAGE_1",
    name: "Whispering Woods",
    description: "ป่าเริ่มต้นที่เต็มไปด้วยสไลม์และก็อบลิน เหมาะสำหรับทีมมือใหม่",
    monsterTemplateIds: ["FOREST_SLIME", "FOREST_SLIME", "GOBLIN_ARCHER"],
  },
  STAGE_BOSS_1: {
    id: "STAGE_BOSS_1",
    name: "Treant's Lair",
    description: "ที่อยู่ของ Ancient Treant บอสประจำป่า Whispering Woods",
    monsterTemplateIds: ["ANCIENT_TREANT"],
  },
};

// ===========================================================
// 3) EQUIPMENT — อุปกรณ์แยกตาม Slot
// ===========================================================
// slot: "WEAPON" | "ARMOR" | "HELMET" | "ACCESSORY"
// requiredClass: null = ทุกอาชีพใส่ได้, หรือ array ของ classId ที่ใส่ได้
export const EQUIPMENT = {
  WOODEN_SWORD: {
    id: "WOODEN_SWORD",
    name: "Wooden Sword",
    slot: "WEAPON",
    rarity: "COMMON",
    statBonus: { STR: 3 },
    requiredClass: ["WARRIOR"],
  },
  APPRENTICE_STAFF: {
    id: "APPRENTICE_STAFF",
    name: "Apprentice Staff",
    slot: "WEAPON",
    rarity: "COMMON",
    statBonus: { INT: 4 },
    requiredClass: ["MAGE"],
  },
  HUNTER_BOW: {
    id: "HUNTER_BOW",
    name: "Hunter's Bow",
    slot: "WEAPON",
    rarity: "COMMON",
    statBonus: { DEX: 3, AGI: 1 },
    requiredClass: ["ARCHER"],
  },
  HOLY_MACE: {
    id: "HOLY_MACE",
    name: "Holy Mace",
    slot: "WEAPON",
    rarity: "COMMON",
    statBonus: { INT: 2, VIT: 2 },
    requiredClass: ["CLERIC"],
  },
  LEATHER_ARMOR: {
    id: "LEATHER_ARMOR",
    name: "Leather Armor",
    slot: "ARMOR",
    rarity: "COMMON",
    statBonus: { VIT: 3, AGI: 1 },
    requiredClass: null,
  },
  PLATE_ARMOR: {
    id: "PLATE_ARMOR",
    name: "Plate Armor",
    slot: "ARMOR",
    rarity: "RARE",
    statBonus: { VIT: 8, AGI: -2 },
    requiredClass: ["WARRIOR"],
  },
  IRON_HELMET: {
    id: "IRON_HELMET",
    name: "Iron Helmet",
    slot: "HELMET",
    rarity: "COMMON",
    statBonus: { VIT: 2 },
    requiredClass: null,
  },
  RING_OF_VIGOR: {
    id: "RING_OF_VIGOR",
    name: "Ring of Vigor",
    slot: "ACCESSORY",
    rarity: "RARE",
    statBonus: { STR: 1, INT: 1, DEX: 1, VIT: 1, AGI: 1 },
    requiredClass: null,
  },
};
