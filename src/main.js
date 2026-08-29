// src/main.js
// ---------------------------------------------------------
// จุดเริ่มต้นของเว็บแอป — จัดการสลับหน้าจอ (login / lobby / battle)
// และ restore session อัตโนมัติถ้าผู้เล่นเคยล็อกอินไว้แล้ว (Anonymous Auth
// จะคงอยู่ในเบราว์เซอร์เดิมจนกว่าจะ sign out หรือ clear storage)
// ---------------------------------------------------------

import { onAuthChange, fetchPlayerData } from "./managers/authManager.js";
import { renderLoginView } from "./ui/loginView.js";
import { renderLobbyView } from "./ui/lobbyView.js";
import { renderBattleView } from "./ui/battleView.js";

const app = document.getElementById("app");

const VIEWS = {
  login: renderLoginView,
  lobby: renderLobbyView,
  battle: renderBattleView,
};

/**
 * สลับหน้าจอปัจจุบัน — ล้าง DOM เดิมแล้ว render view ใหม่
 * @param {"login"|"lobby"|"battle"} viewName
 * @param {Object} [params]
 */
function navigate(viewName, params = {}) {
  const renderFn = VIEWS[viewName];
  if (!renderFn) {
    console.error(`navigate: ไม่พบ view ชื่อ "${viewName}"`);
    return;
  }
  app.innerHTML = "";
  renderFn(app, navigate, params);
}

// ---------------------------------------------------------
// เริ่มต้นแอป: เช็กว่ามี session ค้างอยู่หรือไม่
// - ถ้ามี user + มีเอกสารผู้เล่นใน Firestore แล้ว -> ข้ามไปหน้า lobby เลย
// - ถ้าไม่มี -> แสดงหน้า login ให้สร้างตัวละครใหม่
// ---------------------------------------------------------
onAuthChange(async (user) => {
  if (user) {
    try {
      const playerData = await fetchPlayerData(user.uid);
      if (playerData) {
        navigate("lobby", { playerData });
        return;
      }
    } catch (err) {
      console.error("restore session failed:", err);
    }
  }
  navigate("login");
});
