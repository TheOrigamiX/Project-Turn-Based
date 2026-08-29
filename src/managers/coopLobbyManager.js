// src/managers/coopLobbyManager.js
// ---------------------------------------------------------
// จัดการห้องปาร์ตี้ (Party/Lobby) สำหรับโหมด Co-op
// ใช้ Firestore เก็บข้อมูลห้อง (rooms collection) และใช้
// onSnapshot เพื่อติดตามการเปลี่ยนแปลงสมาชิกแบบ Realtime
// ---------------------------------------------------------

import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebaseConfig.js";

const MAX_PARTY_SIZE = 4;
const MIN_PARTY_SIZE = 2;

/**
 * สุ่มรหัสห้อง 6 หลัก (ตัวเลข+ตัวอักษรพิมพ์ใหญ่)
 */
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ตัดตัวที่สับสน เช่น 0, O, I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * สร้างห้องปาร์ตี้ใหม่
 * @param {string} hostId - userId ของผู้สร้างห้อง
 * @param {string} stageId - ด่านที่จะเล่น
 * @returns {Promise<string>} roomCode ที่สร้าง
 */
export async function createParty(hostId, stageId) {
  const roomCode = generateRoomCode();
  const roomRef = doc(db, "rooms", roomCode);

  await setDoc(roomRef, {
    roomCode,
    hostId,
    stageId,
    status: "waiting", // waiting -> in_progress -> finished
    members: [
      {
        userId: hostId,
        characterData: null,
        isReady: false,
        isHost: true,
      },
    ],
    maxMembers: MAX_PARTY_SIZE,
    createdAt: serverTimestamp(),
  });

  return roomCode;
}

/**
 * เข้าร่วมปาร์ตี้ที่มีอยู่ (รองรับ 2-4 คน)
 * @param {string} roomCode
 * @param {string} guestId
 */
export async function joinParty(roomCode, guestId) {
  const roomRef = doc(db, "rooms", roomCode);
  const snapshot = await getDoc(roomRef);

  if (!snapshot.exists()) {
    throw new Error(`joinParty: ไม่พบห้อง roomCode=${roomCode}`);
  }

  const room = snapshot.data();

  if (room.status !== "waiting") {
    throw new Error("joinParty: ห้องนี้เริ่มเกมไปแล้วหรือปิดรับสมาชิกแล้ว");
  }
  if (room.members.length >= room.maxMembers) {
    throw new Error(`joinParty: ห้องเต็มแล้ว (สูงสุด ${MAX_PARTY_SIZE} คน)`);
  }
  if (room.members.some((m) => m.userId === guestId)) {
    // ผู้เล่นอยู่ในห้องนี้แล้ว ไม่ต้อง add ซ้ำ
    return room;
  }

  const newMember = {
    userId: guestId,
    characterData: null,
    isReady: false,
    isHost: false,
  };

  await updateDoc(roomRef, {
    members: arrayUnion(newMember),
  });

  return { ...room, members: [...room.members, newMember] };
}

/**
 * เลือกตัวละครและตั้งสถานะ ready ของสมาชิกในห้อง
 * @param {string} roomCode
 * @param {string} playerId
 * @param {Object} characterData - ข้อมูลตัวละครที่เลือก (race, class, finalStats ฯลฯ)
 */
export async function selectCharacter(roomCode, playerId, characterData) {
  const roomRef = doc(db, "rooms", roomCode);
  const snapshot = await getDoc(roomRef);

  if (!snapshot.exists()) {
    throw new Error(`selectCharacter: ไม่พบห้อง roomCode=${roomCode}`);
  }

  const room = snapshot.data();
  const updatedMembers = room.members.map((m) =>
    m.userId === playerId ? { ...m, characterData, isReady: true } : m
  );

  await updateDoc(roomRef, { members: updatedMembers });

  // ถ้าสมาชิกครบและทุกคน ready + จำนวน >= ขั้นต่ำ ให้เปลี่ยนสถานะห้องเป็น in_progress
  const allReady =
    updatedMembers.length >= MIN_PARTY_SIZE &&
    updatedMembers.every((m) => m.isReady);

  if (allReady) {
    await updateDoc(roomRef, { status: "in_progress" });
  }

  return updatedMembers;
}

/**
 * ติดตามการเปลี่ยนแปลงของห้องปาร์ตี้แบบ Realtime
 * @param {string} roomCode
 * @param {(roomData: Object) => void} callback
 * @returns {Function} unsubscribe function - เรียกเพื่อยกเลิกการติดตาม
 */
export function listenToParty(roomCode, callback) {
  const roomRef = doc(db, "rooms", roomCode);

  const unsubscribe = onSnapshot(
    roomRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        callback(null); // ห้องถูกลบหรือไม่พบ
      }
    },
    (error) => {
      console.error("listenToParty error:", error);
    }
  );

  return unsubscribe;
}
