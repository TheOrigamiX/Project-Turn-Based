// src/ui/lobbyView.js
// ---------------------------------------------------------
// หน้าจอห้องปาร์ตี้: สร้างห้องใหม่ (เลือกด่าน) หรือเข้าร่วมด้วยรหัส 6 หลัก
// เมื่ออยู่ในห้องแล้ว ติดตามสมาชิกแบบ Realtime และกด "พร้อมออกรบ"
// เมื่อสมาชิกครบและทุกคนพร้อม ห้องจะเปลี่ยนสถานะเป็น in_progress
// โดยอัตโนมัติ — host จะเป็นผู้เริ่มสร้างข้อมูลการต่อสู้จริง
// ---------------------------------------------------------

import { auth } from "../config/firebaseConfig.js";
import {
  createParty,
  joinParty,
  selectCharacter,
  listenToParty,
} from "../managers/coopLobbyManager.js";
import { startBattleFromRoom } from "../managers/battleInitializer.js";
import { STAGES } from "../data/gameData.js";
import { CLASS_DATA } from "../data/classData.js";

/**
 * @param {HTMLElement} container
 * @param {(view: string, params?: Object) => void} navigate
 * @param {Object} params - { playerData }
 */
export function renderLobbyView(container, navigate, params) {
  const uid = auth.currentUser?.uid;
  const playerData = params.playerData;
  let unsubscribe = null;
  let currentRoomCode = null;
  let hasStartedBattle = false;

  renderEntryScreen();

  // ---------------- ENTRY: create or join ----------------
  function renderEntryScreen() {
    container.innerHTML = `
      <div class="screen">
        <div class="brand">
          <span class="brand__crest">⚔</span>
          <span class="brand__name">Emberfall</span>
          <span class="brand__tag">Co-op Trials</span>
        </div>

        <div class="panel">
          <h2>สวัสดี, ${playerData.displayName}</h2>
          <p class="subtitle">${CLASS_DATA[playerData.classId].name} · Level ${playerData.level} — สร้างห้องใหม่หรือเข้าร่วมปาร์ตี้ของเพื่อน</p>

          <div id="error-slot"></div>

          <div class="field">
            <label for="stage-select">เลือกด่าน (สำหรับสร้างห้อง)</label>
            <select id="stage-select">
              ${Object.values(STAGES)
                .map((s) => `<option value="${s.id}">${s.name}</option>`)
                .join("")}
            </select>
          </div>
          <button class="btn" id="create-btn">สร้างห้องปาร์ตี้</button>

          <div class="divider-or">หรือ</div>

          <div class="field">
            <label for="room-code-input">รหัสห้อง</label>
            <input id="room-code-input" type="text" maxlength="6" placeholder="เช่น A2K9F7" style="text-transform:uppercase" />
          </div>
          <button class="btn btn--ghost" id="join-btn">เข้าร่วมห้อง</button>
        </div>
      </div>
    `;

    const errorSlot = container.querySelector("#error-slot");

    container.querySelector("#create-btn").addEventListener("click", async () => {
      errorSlot.innerHTML = "";
      const stageId = container.querySelector("#stage-select").value;
      try {
        const roomCode = await createParty(uid, stageId);
        enterRoom(roomCode);
      } catch (err) {
        errorSlot.innerHTML = `<div class="error-msg">สร้างห้องไม่สำเร็จ: ${err.message}</div>`;
      }
    });

    container.querySelector("#join-btn").addEventListener("click", async () => {
      errorSlot.innerHTML = "";
      const roomCode = container.querySelector("#room-code-input").value.trim().toUpperCase();
      if (!roomCode) {
        errorSlot.innerHTML = `<div class="error-msg">กรุณากรอกรหัสห้อง</div>`;
        return;
      }
      try {
        await joinParty(roomCode, uid);
        enterRoom(roomCode);
      } catch (err) {
        errorSlot.innerHTML = `<div class="error-msg">เข้าร่วมห้องไม่สำเร็จ: ${err.message}</div>`;
      }
    });
  }

  // ---------------- IN ROOM: waiting / ready ----------------
  function enterRoom(roomCode) {
    currentRoomCode = roomCode;
    renderRoomScreen(null);

    unsubscribe = listenToParty(roomCode, async (room) => {
      if (!room) return;
      renderRoomScreen(room);

      // เมื่อทุกคนพร้อมและห้องเปลี่ยนสถานะเป็น in_progress -> ไปหน้าต่อสู้
      if (room.status === "in_progress") {
        // ให้ host เท่านั้นเป็นผู้เขียนข้อมูลเริ่มการต่อสู้ลง Realtime Database
        // (กันไม่ให้สมาชิกหลายคนเขียนซ้อนกันพร้อมกัน)
        if (room.hostId === uid && !hasStartedBattle) {
          hasStartedBattle = true;
          try {
            await startBattleFromRoom(roomCode, room);
          } catch (err) {
            console.error("startBattleFromRoom failed:", err);
          }
        }
        if (unsubscribe) unsubscribe();
        navigate("battle", { roomCode, playerData });
      }
    });
  }

  function renderRoomScreen(room) {
    const members = room?.members || [
      { userId: uid, characterData: null, isReady: false, isHost: true },
    ];

    container.innerHTML = `
      <div class="screen">
        <div class="brand">
          <span class="brand__crest">⚔</span>
          <span class="brand__name">Emberfall</span>
          <span class="brand__tag">Co-op Trials</span>
        </div>

        <div class="panel">
          <h2>ห้องปาร์ตี้</h2>
          <p class="subtitle">แชร์รหัสห้องนี้ให้เพื่อนของคุณเพื่อเข้าร่วม (2–4 คน)</p>

          <div class="room-code-display">${currentRoomCode}</div>
          <p class="room-code-hint">แตะเพื่อคัดลอก</p>

          <ul class="member-list">
            ${members
              .map(
                (m) => `
              <li class="member-row">
                <div class="member-row__avatar">${(m.characterData?.displayName || "?").charAt(0).toUpperCase()}</div>
                <div class="member-row__info">
                  <div class="member-row__name">
                    ${m.characterData?.displayName || "รอเลือกตัวละคร..."}
                    ${m.isHost ? '<span class="tag-host">Host</span>' : ""}
                  </div>
                  <div class="member-row__class">
                    ${m.characterData ? `${CLASS_DATA[m.characterData.classId]?.name}` : "&nbsp;"}
                  </div>
                </div>
                <span class="status-dot ${m.isReady ? "is-ready" : ""}"></span>
              </li>
            `
              )
              .join("")}
          </ul>

          <button class="btn" id="ready-btn">พร้อมออกรบ</button>
        </div>
      </div>
    `;

    const readyBtn = container.querySelector("#ready-btn");
    const me = members.find((m) => m.userId === uid);
    if (me?.isReady) {
      readyBtn.disabled = true;
      readyBtn.textContent = "พร้อมแล้ว — รอเพื่อนร่วมทีม...";
    }

    readyBtn.addEventListener("click", async () => {
      readyBtn.disabled = true;
      readyBtn.textContent = "กำลังยืนยัน...";
      try {
        await selectCharacter(currentRoomCode, uid, playerData);
      } catch (err) {
        console.error(err);
        readyBtn.disabled = false;
        readyBtn.textContent = "พร้อมออกรบ";
      }
    });
  }
}
