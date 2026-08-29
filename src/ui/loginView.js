// src/ui/loginView.js
// ---------------------------------------------------------
// หน้าจอแรกของเกม: ตั้งชื่อตัวละคร เลือกเผ่า และเลือกอาชีพ
// เมื่อกด "เริ่มการผจญภัย" จะเรียก authManager เพื่อล็อกอินแบบ
// Anonymous และสร้างเอกสารผู้เล่นใหม่ (ถ้ายังไม่เคยมี)
// ---------------------------------------------------------

import { loginAndCreateCharacter } from "../managers/authManager.js";
import { RACES } from "../data/gameData.js";
import { CLASS_DATA } from "../data/classData.js";

/**
 * @param {HTMLElement} container
 * @param {(view: string, params?: Object) => void} navigate
 */
export function renderLoginView(container, navigate) {
  let selectedRace = "HUMAN";
  let selectedClass = "WARRIOR";

  container.innerHTML = `
    <div class="screen">
      <div class="brand">
        <span class="brand__crest">⚔</span>
        <span class="brand__name">Emberfall</span>
        <span class="brand__tag">Co-op Trials</span>
      </div>

      <form class="panel" id="login-form" novalidate>
        <h2>สร้างตัวละครของคุณ</h2>
        <p class="subtitle">ตั้งชื่อ เลือกเผ่า และอาชีพ ก่อนออกเดินทางไปกับเพื่อนร่วมทีม</p>

        <div id="error-slot"></div>

        <div class="field">
          <label for="display-name">ชื่อตัวละคร</label>
          <input id="display-name" type="text" maxlength="16" placeholder="เช่น Aria the Bold" required />
        </div>

        <div class="field">
          <label>เผ่า</label>
          <div class="choice-grid" id="race-grid"></div>
        </div>

        <div class="field">
          <label>อาชีพ</label>
          <div class="choice-grid" id="class-grid"></div>
        </div>

        <button type="submit" class="btn" id="submit-btn">เริ่มการผจญภัย</button>
      </form>
    </div>
  `;

  const raceGrid = container.querySelector("#race-grid");
  const classGrid = container.querySelector("#class-grid");
  const errorSlot = container.querySelector("#error-slot");
  const submitBtn = container.querySelector("#submit-btn");

  function renderChoices(grid, entries, selectedId, onSelect) {
    grid.innerHTML = "";
    for (const entry of entries) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "choice-card" + (entry.id === selectedId ? " is-selected" : "");
      card.innerHTML = `
        <span class="choice-card__name">${entry.name}</span>
        <span class="choice-card__desc">${entry.description}</span>
      `;
      card.addEventListener("click", () => onSelect(entry.id));
      grid.appendChild(card);
    }
  }

  function refreshRaceGrid() {
    renderChoices(raceGrid, Object.values(RACES), selectedRace, (id) => {
      selectedRace = id;
      refreshRaceGrid();
    });
  }

  function refreshClassGrid() {
    renderChoices(classGrid, Object.values(CLASS_DATA), selectedClass, (id) => {
      selectedClass = id;
      refreshClassGrid();
    });
  }

  refreshRaceGrid();
  refreshClassGrid();

  container.querySelector("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    errorSlot.innerHTML = "";

    const displayName = container.querySelector("#display-name").value.trim();
    if (!displayName) {
      errorSlot.innerHTML = `<div class="error-msg">กรุณาตั้งชื่อตัวละครก่อนเริ่มเกม</div>`;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "กำลังเรียกวิญญาณนักผจญภัย...";

    try {
      const playerData = await loginAndCreateCharacter({
        displayName,
        raceId: selectedRace,
        classId: selectedClass,
      });
      navigate("lobby", { playerData });
    } catch (err) {
      console.error(err);
      errorSlot.innerHTML = `<div class="error-msg">เข้าสู่เกมไม่สำเร็จ: ${err.message}</div>`;
      submitBtn.disabled = false;
      submitBtn.textContent = "เริ่มการผจญภัย";
    }
  });
}
