// src/ui/battleView.js
// ---------------------------------------------------------
// หน้าจอการต่อสู้: แสดงลำดับเทิร์น (turn banner), HP/Mana ของ
// พันธมิตรและศัตรู, แถบเลือกสกิล/เป้าหมาย, และ Combat Log แบบ Realtime
// เชื่อมกับ battles/{roomCode} ผ่าน turnOrderManager.listenToBattle
// ---------------------------------------------------------

import { auth } from "../config/firebaseConfig.js";
import { listenToBattle } from "../managers/turnOrderManager.js";
import { handlePlayerAction } from "../managers/playerActionHandler.js";
import { checkStageStatus } from "../managers/stageManager.js";
import { fetchPlayerData } from "../managers/authManager.js";
import { SKILLS, STAGES } from "../data/gameData.js";
import { CLASS_DATA } from "../data/classData.js";

/**
 * @param {HTMLElement} container
 * @param {(view: string, params?: Object) => void} navigate
 * @param {Object} params - { roomCode, playerData }
 */
export function renderBattleView(container, navigate, params) {
  const uid = auth.currentUser?.uid;
  const { roomCode, playerData } = params;

  let selectedSkillId = null;
  let isSubmitting = false;
  let unsubscribe = null;
  let statusResolved = false; // กันการเรียก checkStageStatus/navigate ซ้ำ

  container.innerHTML = `
    <div class="screen">
      <div class="top-bar">
        <div class="brand">
          <span class="brand__crest">⚔</span>
          <span class="brand__name">Emberfall</span>
        </div>
        <div class="top-bar__player">${playerData.displayName} · <strong>${CLASS_DATA[playerData.classId].name}</strong></div>
      </div>
      <div class="battle-screen" id="battle-root">
        <p class="subtitle" style="text-align:center">กำลังเตรียมสนามรบ...</p>
      </div>
    </div>
  `;

  const root = container.querySelector("#battle-root");

  unsubscribe = listenToBattle(roomCode, (battle) => {
    if (!battle || !battle.combatants) {
      root.innerHTML = `<p class="subtitle" style="text-align:center">กำลังเตรียมสนามรบ...</p>`;
      return;
    }
    renderBattle(battle);
  });

  async function renderBattle(battle) {
    const combatants = battle.combatants;
    const players = Object.values(combatants).filter((c) => c.type === "PLAYER");
    const monsters = Object.values(combatants).filter((c) => c.type === "MONSTER");
    const stage = STAGES[battle.stageId];
    const isMyTurn = battle.currentTurn === uid && battle.status === "in_progress";
    const me = combatants[uid];

    // ---------- Victory / Defeat ----------
    if (battle.status === "victory" || battle.status === "defeat") {
      if (unsubscribe) unsubscribe();
      root.innerHTML = renderResultBanner(battle.status);
      container.querySelector("#back-to-lobby-btn")?.addEventListener("click", async () => {
        const freshPlayerData = (await fetchPlayerData(uid)) || playerData;
        navigate("lobby", { playerData: freshPlayerData });
      });
      return;
    }

    root.innerHTML = `
      <div class="stage-banner">
        <div class="stage-banner__name">${stage?.name || battle.stageId}</div>
        <div class="stage-banner__desc">${stage?.description || ""}</div>
      </div>

      <div class="turn-banner" id="turn-banner"></div>

      <div class="battle-grid">
        <div class="combatant-column">
          <div class="column-label">ทีมของคุณ</div>
          <div id="ally-column"></div>
        </div>
        <div class="combatant-column">
          <div class="column-label">ศัตรู</div>
          <div id="enemy-column"></div>
        </div>
      </div>

      <div class="action-bar" id="action-bar"></div>

      <div class="combat-log" id="combat-log"></div>
    `;

    renderTurnBanner(battle.turnQueue, combatants, battle.currentTurn);
    renderColumn(container.querySelector("#ally-column"), players, { combatants, battle, isMyTurn });
    renderColumn(container.querySelector("#enemy-column"), monsters, { combatants, battle, isMyTurn });
    renderActionBar(me, isMyTurn, battle);
    renderCombatLog(battle.combatLog);

    // ตรวจสอบสถานะด่านหลังทุกครั้งที่ battle อัปเดต (idempotent-ish สำหรับ demo)
    const allMonstersDead = monsters.length > 0 && monsters.every((m) => m.hp <= 0);
    const allPlayersDead = players.length > 0 && players.every((p) => p.hp <= 0);
    if ((allMonstersDead || allPlayersDead) && !statusResolved) {
      statusResolved = true;
      try {
        await checkStageStatus(roomCode);
      } catch (err) {
        console.error("checkStageStatus failed:", err);
      }
    }
  }

  function renderTurnBanner(turnQueue, combatants, currentTurn) {
    const el = container.querySelector("#turn-banner");
    if (!el || !turnQueue) return;
    el.innerHTML = turnQueue
      .map((id) => {
        const c = combatants[id];
        if (!c) return "";
        const isActive = id === currentTurn;
        const isDead = c.hp <= 0;
        return `
          <div class="turn-chip ${isActive ? "is-active" : ""} ${c.type === "MONSTER" ? "is-monster" : ""} ${isDead ? "is-dead" : ""}">
            <div class="turn-chip__portrait">${c.name.charAt(0).toUpperCase()}</div>
            <div class="turn-chip__name">${c.name}</div>
          </div>
        `;
      })
      .join("");
  }

  function renderColumn(el, list, ctx) {
    if (!el) return;
    el.innerHTML = "";
    for (const c of list) {
      const card = document.createElement("div");
      const isDead = c.hp <= 0;
      const isCurrentTurn = c.id === ctx.battle.currentTurn;
      const isTargetable = computeIsTargetable(c, ctx);

      card.className = [
        "combatant-card",
        isCurrentTurn ? "is-current-turn" : "",
        isDead ? "is-dead" : "",
        isTargetable ? "is-targetable" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const hpPct = Math.max(0, Math.round((c.hp / c.maxHP) * 100));
      const manaPct = c.maxMana ? Math.max(0, Math.round((c.mana / c.maxMana) * 100)) : 0;

      card.innerHTML = `
        <div class="combatant-card__top">
          <span class="combatant-card__name">${c.name}${c.isBoss ? " 👑" : ""}</span>
          <span class="combatant-card__level">${c.type === "PLAYER" ? "LV " + (c.level || 1) : ""}</span>
        </div>
        <div class="gauge-label"><span>HP</span><span>${c.hp}/${c.maxHP}</span></div>
        <div class="gauge"><div class="gauge__fill gauge__fill--hp" style="width:${hpPct}%"></div></div>
        ${
          c.maxMana
            ? `<div class="gauge-label"><span>MP</span><span>${c.mana}/${c.maxMana}</span></div>
               <div class="gauge"><div class="gauge__fill gauge__fill--mana" style="width:${manaPct}%"></div></div>`
            : ""
        }
      `;

      if (isTargetable) {
        card.addEventListener("click", () => submitAction([c.id]));
      }

      el.appendChild(card);
    }
  }

  function computeIsTargetable(c, ctx) {
    if (!selectedSkillId || !ctx.isMyTurn || c.hp <= 0) return false;
    const skill = SKILLS[selectedSkillId];
    if (!skill) return false;
    if (skill.targetType === "SINGLE") return c.type === "MONSTER";
    if (skill.targetType === "ALLY") return c.type === "PLAYER";
    return false; // AOE / ALL_ALLY ไม่ต้องเลือกเป้าหมายเอง
  }

  function renderActionBar(me, isMyTurn, battle) {
    const el = container.querySelector("#action-bar");
    if (!el) return;

    if (battle.status !== "in_progress") {
      el.innerHTML = "";
      return;
    }

    if (!isMyTurn) {
      const currentName = battle.combatants[battle.currentTurn]?.name || "...";
      el.innerHTML = `<p class="action-bar__hint">รอเทิร์นของ <strong>${currentName}</strong></p>`;
      return;
    }

    const classSkills = CLASS_DATA[playerData.classId].classSkills.filter(
      (s) => s.unlockLevel <= (playerData.level || 1)
    );

    const hintText = selectedSkillId
      ? `เลือกเป้าหมายสำหรับ <strong>${SKILLS[selectedSkillId].name}</strong>`
      : `เทิร์นของคุณ — เลือกสกิลที่จะใช้`;

    el.innerHTML = `
      <p class="action-bar__hint">${hintText}</p>
      <div class="skill-row" id="skill-row"></div>
    `;

    const skillRow = el.querySelector("#skill-row");
    for (const { skillId } of classSkills) {
      const skill = SKILLS[skillId];
      const cooldownLeft = me.cooldowns?.[skillId] || 0;
      const notEnoughMana = me.mana < skill.manaCost;
      const disabled = isSubmitting || cooldownLeft > 0 || notEnoughMana;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skill-btn" + (selectedSkillId === skillId ? " is-selected" : "");
      btn.disabled = disabled;
      btn.innerHTML = `
        ${skill.name}
        <span class="skill-btn__cost">
          ${skill.manaCost} MP${cooldownLeft > 0 ? ` · CD ${cooldownLeft}` : ""}
        </span>
      `;
      btn.addEventListener("click", () => {
        if (skill.targetType === "AOE" || skill.targetType === "ALL_ALLY") {
          selectedSkillId = skillId;
          submitAction([]);
        } else {
          selectedSkillId = selectedSkillId === skillId ? null : skillId;
          renderActionBar(me, isMyTurn, battle);
          // re-render columns so targetable highlighting updates
          const players = Object.values(battle.combatants).filter((c) => c.type === "PLAYER");
          const monsters = Object.values(battle.combatants).filter((c) => c.type === "MONSTER");
          renderColumn(container.querySelector("#ally-column"), players, { combatants: battle.combatants, battle, isMyTurn });
          renderColumn(container.querySelector("#enemy-column"), monsters, { combatants: battle.combatants, battle, isMyTurn });
        }
      });
      skillRow.appendChild(btn);
    }
  }

  function renderCombatLog(combatLog) {
    const el = container.querySelector("#combat-log");
    if (!el) return;
    const entries = Object.entries(combatLog || {}).sort(([a], [b]) => (a > b ? 1 : -1));
    el.innerHTML = entries
      .map(([, entry]) => `<div class="combat-log__entry"><span class="tag">›</span> ${entry.message}</div>`)
      .join("") || `<div class="combat-log__entry">การต่อสู้เริ่มต้นขึ้น...</div>`;
    el.scrollTop = el.scrollHeight;
  }

  async function submitAction(targetIds) {
    if (!selectedSkillId || isSubmitting) return;
    isSubmitting = true;
    try {
      await handlePlayerAction(roomCode, uid, selectedSkillId, targetIds);
    } catch (err) {
      console.error("handlePlayerAction failed:", err);
      alert(err.message);
    } finally {
      selectedSkillId = null;
      isSubmitting = false;
    }
  }

  function renderResultBanner(status) {
    const isVictory = status === "victory";
    return `
      <div class="panel result-banner">
        <div class="result-banner__title ${isVictory ? "is-victory" : "is-defeat"}">
          ${isVictory ? "🏆 ชัยชนะ!" : "💀 พ่ายแพ้"}
        </div>
        <p class="subtitle">
          ${isVictory ? "ทีมของคุณปราบศัตรูได้สำเร็จ ได้รับ EXP, Gold และไอเทมเรียบร้อยแล้ว" : "ทีมของคุณพ่ายแพ้ต่อศัตรู ลองรวบรวมทีมใหม่แล้วกลับมาอีกครั้ง"}
        </p>
        <button class="btn" id="back-to-lobby-btn">กลับไปที่ล็อบบี้</button>
      </div>
    `;
  }
}
