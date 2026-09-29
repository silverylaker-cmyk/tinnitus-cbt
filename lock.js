/* 주차 잠금 — 진료 때 받은 코드로 암호화된 주차 원고를 푼다 (환자 앱·의료진 페이지 공용)
   원고 암호화: tools/lock_weeks.mjs · 코드 목록: unlock-codes.json(비공개, 저장소에 없음) */
"use strict";
const Lock = (() => {
  const P = window.PROGRAM, L = P.lock || null;
  const te = new TextEncoder(), td = new TextDecoder();
  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const toB64 = (u8) => btoa(String.fromCharCode(...u8));
  // tools/lock_weeks.mjs 의 norm 과 같아야 합니다
  const norm = (c) => String(c || "").normalize("NFKC").toUpperCase().replace(/[\s\-_.]/g, "");
  const supported = () => !!(window.crypto && crypto.subtle);
  const lockedWeeks = () => (L ? Object.keys(L.weeks).map(Number).sort((a, b) => a - b) : []);

  // tools/lock_weeks.mjs 와 같아야 합니다: 코드 → PBKDF2 → 용도별(주차·마스터) HKDF
  async function derive(code) {
    const pw = await crypto.subtle.importKey("raw", te.encode(norm(code)), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromB64(L.salt), iterations: L.iter }, pw, 256);
    return crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveBits"]);
  }
  const sub = async (base, info) => new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: te.encode(info) }, base, 256));
  const isOpen = (w) => P.modules.filter((m) => m.week === w).every((m) => m.screens);
  async function open(box, raw) {
    try {
      const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
      return JSON.parse(td.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(box.iv) }, key, fromB64(box.ct))));
    } catch (e) { return null; } // 코드가 틀리면 여기로 온다
  }
  function relock() { const ws = lockedWeeks(); for (const m of P.modules) if (ws.includes(m.week)) m.screens = null; }

  // 저장해 둔 열쇠({주차: base64})로 원고를 푼다. 실제로 풀린 열쇠만 돌려준다 (코드가 바뀌어 안 맞는 열쇠는 버림)
  async function restore(keys) {
    const good = {};
    if (!L || !supported()) return good;
    for (const [w, k] of Object.entries(keys || {})) {
      const box = L.weeks[w]; if (!box) continue;
      const p = await open(box, fromB64(k)); if (!p) continue;
      for (const m of P.modules) if (p.screens[m.id]) m.screens = p.screens[m.id];
      good[w] = k;
    }
    return good;
  }
  // 코드 하나를 넣어 본다 → 새로 얻은 열쇠들 (틀리면 null)
  // 주차 코드는 그 코드로 잠긴 주차 중 아직 안 열린 첫 주차 하나만 연다. 마스터 코드는 전체를 연다
  async function tryCode(code) {
    if (!L || !supported() || !norm(code)) return null;
    const base = await derive(code);
    if (L.master) { const p = await open(L.master, await sub(base, "master")); if (p) return p.keys; }
    let already = null;
    for (const w of lockedWeeks()) {
      const k = await sub(base, "week-" + w);
      if (!(await open(L.weeks[w], k))) continue;
      if (!isOpen(w)) return { [w]: toB64(k) };
      already = { [w]: toB64(k) }; // 이미 열린 주차의 코드
    }
    return already;
  }
  return { enabled: !!L, supported, lockedWeeks, restore, tryCode, relock };
})();
