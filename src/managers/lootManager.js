// src/managers/lootManager.js
// ---------------------------------------------------------
// เมื่อผู้เล่นชนะด่าน (Victory) ให้สุ่มดร็อปไอเทมตาม Rarity/Drop Rate
// และแจก EXP/Gold ให้ผู้เล่นทุกคนในทีม โดยเขียนข้อมูลลง Firestore
// ด้วย writeBatch เพื่อความ atomic (อัปเดตหลายเอกสารพร้อมกัน)
// ---------------------------------------------------------

import { doc, writeBatch, getDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig.js";

// ตัวอย่างตาราง Loot ต่อด่าน (ในโปรเจกต์จริงควรแยกเก็บใน gameData.js หรือ Firestore เอง)
// dropRate เป็นค่า 0-1 (โอกาสดรอปของแต่ละไอเทม อิสระต่อกัน ไม่ผูกกัน)
const STAGE_LOOT_TABLE = {
  STAGE_1: {
    baseExp: 100,
    baseGold: 50,
    drops: [
      { itemId: "WOODEN_SWORD", rarity: "COMMON", dropRate: 0.3 },
      { itemId: "LEATHER_ARMOR", rarity: "COMMON", dropRate: 0.25 },
      { itemId: "RING_OF_VIGOR", rarity: "RARE", dropRate: 0.05 },
    ],
  },
  STAGE_BOSS_1: {
    baseExp: 500,
    baseGold: 300,
    drops: [
      { itemId: "PLATE_ARMOR", rarity: "RARE", dropRate: 0.15 },
      { itemId: "RING_OF_VIGOR", rarity: "RARE", dropRate: 0.1 },
    ],
  },
};

/**
 * สุ่มว่าไอเทมแต่ละชิ้นจะดรอปหรือไม่ ตาม dropRate ของมัน (อิสระต่อกัน)
 * @param {Array} drops
 * @returns {Array<string>} รายการ itemId ที่ดรอปจริง
 */
function rollDrops(drops) {
  const droppedItems = [];
  for (const drop of drops) {
    if (Math.random() < drop.dropRate) {
      droppedItems.push(drop.itemId);
    }
  }
  return droppedItems;
}

/**
 * แจกรางวัล (EXP, Gold, Item) ให้ผู้เล่นทุกคนในทีมที่รอดชีวิต
 * ใช้ writeBatch เพื่ออัปเดตทุกคนแบบ atomic (สำเร็จหรือล้มเหลวพร้อมกันทั้งหมด)
 * @param {string} roomCode
 * @param {string[]} playerIds - userId ของผู้เล่นที่รอดชีวิตและควรได้รับรางวัล
 * @param {string} stageId
 */
export async function distributeLoot(roomCode, playerIds, stageId) {
  const lootTable = STAGE_LOOT_TABLE[stageId];
  if (!lootTable) {
    throw new Error(`distributeLoot: ไม่พบ loot table สำหรับ stageId=${stageId}`);
  }

  const batch = writeBatch(db);
  const results = {};

  for (const playerId of playerIds) {
    const playerRef = doc(db, "players", playerId);
    const snapshot = await getDoc(playerRef);

    if (!snapshot.exists()) {
      console.warn(`distributeLoot: ไม่พบผู้เล่น userId=${playerId}, ข้ามการแจกรางวัล`);
      continue;
    }

    const playerData = snapshot.data();

    // สุ่มดรอปไอเทมของผู้เล่นแต่ละคนแยกกัน (แต่ละคนมีโอกาสได้ไม่เท่ากัน)
    const droppedItemIds = rollDrops(lootTable.drops);

    const newExp = (playerData.exp || 0) + lootTable.baseExp;
    const newGold = (playerData.gold || 0) + lootTable.baseGold;
    const newInventoryItems = [
      ...(playerData.inventory?.items || []),
      ...droppedItemIds,
    ];

    batch.update(playerRef, {
      exp: newExp,
      gold: newGold,
      "inventory.items": newInventoryItems,
    });

    results[playerId] = {
      expGained: lootTable.baseExp,
      goldGained: lootTable.baseGold,
      itemsDropped: droppedItemIds,
    };
  }

  // ยิงทุกการอัปเดตพร้อมกันแบบ atomic — ถ้าล้มเหลวจะไม่มีใครได้รางวัลเลย (ป้องกันข้อมูลไม่สอดคล้อง)
  await batch.commit();

  return results;
}
