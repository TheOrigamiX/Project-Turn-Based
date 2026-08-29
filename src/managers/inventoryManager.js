// src/managers/inventoryManager.js
// ---------------------------------------------------------
// จัดการ Inventory และการสวมใส่/ถอดอุปกรณ์ของผู้เล่นผ่าน Firestore
// ทุกครั้งที่มีการเปลี่ยนแปลงอุปกรณ์ จะเรียก statsCalculator เพื่อ
// คำนวณ finalStats ใหม่แล้วบันทึกกลับไปที่เอกสารผู้เล่นทันที
// ---------------------------------------------------------

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig.js";
import { calculateFinalStats } from "../utils/statsCalculator.js";
import { RACES, EQUIPMENT } from "../data/gameData.js";
import { CLASS_DATA } from "../data/classData.js";

const gameData = { RACES, EQUIPMENT };

/**
 * ดึงข้อมูล Inventory ของผู้เล่นจาก Firestore
 * @param {string} userId
 * @returns {Promise<Object>} inventory data { items: [...], equipped: {...} }
 */
export async function fetchPlayerInventory(userId) {
  const playerRef = doc(db, "players", userId);
  const snapshot = await getDoc(playerRef);

  if (!snapshot.exists()) {
    throw new Error(`fetchPlayerInventory: ไม่พบผู้เล่น userId=${userId}`);
  }

  const data = snapshot.data();
  return {
    items: data.inventory?.items || [],
    equipped: data.inventory?.equipped || {},
  };
}

/**
 * สวมใส่อุปกรณ์ในช่องที่กำหนด
 * - เช็กก่อนว่า item นั้นมีอยู่จริงใน inventory ของผู้เล่น
 * - เช็ก requiredClass ของไอเทมกับ classId ของผู้เล่น
 * - คำนวณ finalStats ใหม่แล้วบันทึกกลับ Firestore
 * @param {string} userId
 * @param {string} itemId - ต้องตรงกับ key ใน EQUIPMENT (gameData.js)
 * @param {string} slot - "WEAPON" | "ARMOR" | "HELMET" | "ACCESSORY"
 */
export async function equipItem(userId, itemId, slot) {
  const playerRef = doc(db, "players", userId);
  const snapshot = await getDoc(playerRef);

  if (!snapshot.exists()) {
    throw new Error(`equipItem: ไม่พบผู้เล่น userId=${userId}`);
  }

  const playerData = snapshot.data();
  const item = EQUIPMENT[itemId];

  if (!item) {
    throw new Error(`equipItem: ไม่พบไอเทม itemId=${itemId} ใน gameData`);
  }
  if (item.slot !== slot) {
    throw new Error(
      `equipItem: ไอเทม ${itemId} ไม่สามารถใส่ในช่อง ${slot} ได้ (ต้องใส่ช่อง ${item.slot})`
    );
  }

  // เช็กเงื่อนไข requiredClass กับ classData
  if (item.requiredClass && !item.requiredClass.includes(playerData.classId)) {
    throw new Error(
      `equipItem: อาชีพ ${playerData.classId} ไม่สามารถสวมใส่ ${item.name} ได้`
    );
  }

  // เช็กว่าผู้เล่นมีไอเทมนี้อยู่ใน inventory จริงหรือไม่ (ป้องกันการโกง)
  const ownedItems = playerData.inventory?.items || [];
  if (!ownedItems.includes(itemId)) {
    throw new Error(`equipItem: ผู้เล่นไม่มีไอเทม ${itemId} อยู่ใน inventory`);
  }

  // อัปเดตช่อง equipped
  const updatedEquipped = {
    ...(playerData.inventory?.equipped || {}),
    [slot]: item,
  };

  // คำนวณ finalStats ใหม่ทันทีหลังเปลี่ยนอุปกรณ์
  const finalStats = calculateFinalStats(
    {
      level: playerData.level,
      raceId: playerData.raceId,
      classId: playerData.classId,
      baseStats: playerData.baseStats,
      equipped: updatedEquipped,
      buffs: playerData.buffs || [],
    },
    gameData,
    CLASS_DATA
  );

  await updateDoc(playerRef, {
    "inventory.equipped": updatedEquipped,
    finalStats,
  });

  return { equipped: updatedEquipped, finalStats };
}

/**
 * ถอดอุปกรณ์จากช่องที่กำหนด แล้วคำนวณ finalStats ใหม่
 * @param {string} userId
 * @param {string} slot
 */
export async function unequipItem(userId, slot) {
  const playerRef = doc(db, "players", userId);
  const snapshot = await getDoc(playerRef);

  if (!snapshot.exists()) {
    throw new Error(`unequipItem: ไม่พบผู้เล่น userId=${userId}`);
  }

  const playerData = snapshot.data();
  const updatedEquipped = { ...(playerData.inventory?.equipped || {}) };
  delete updatedEquipped[slot];

  const finalStats = calculateFinalStats(
    {
      level: playerData.level,
      raceId: playerData.raceId,
      classId: playerData.classId,
      baseStats: playerData.baseStats,
      equipped: updatedEquipped,
      buffs: playerData.buffs || [],
    },
    gameData,
    CLASS_DATA
  );

  await updateDoc(playerRef, {
    "inventory.equipped": updatedEquipped,
    finalStats,
  });

  return { equipped: updatedEquipped, finalStats };
}
