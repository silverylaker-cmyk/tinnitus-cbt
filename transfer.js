/* 환자 기록 전달 — 압축 → 조각 → QR 프레임, 그리고 그 역과정.
   환자 앱(app.js)과 의료진 페이지(clinic.js)가 함께 사용. Node에서도 테스트 가능. */
(function (root) {
  "use strict";
  const T = {};
  const FRAME_PAYLOAD = 560; // 프레임당 base64 글자 수 (QR 버전 ~18, 오류정정 M 에서 폰 화면 → 태블릿 카메라로 안정적으로 읽히는 크기)

  // ---------- 압축 표현 (보낼 것만 짧은 키로) ----------
  T.compact = function (state) {
    const p = state.profile || {};
    const ws = {};
    for (const [id, w] of Object.entries(state.worksheets || {})) {
      const o = {};
      if (w.single && Object.keys(w.single).length) { o.s = w.single; if (w.singleAt) o.t = w.singleAt; }
      if (w.entries && w.entries.length) o.e = w.entries.map((en) => [en.at, en.responses]);
      if (Object.keys(o).length) ws[id] = o;
    }
    const diary = Object.keys(state.diary || {}).filter((k) => state.diary[k] && (state.diary[k].at || state.diary[k].partial)).sort().map((k) => {
      const d = state.diary[k];
      return [k, d.tinnitus, d.annoyance, d.sleep, d.mindfulness ? 1 : 0, d.pmr ? 1 : 0, d.trigger || "", d.memo || ""];
    });
    const sounds = {};
    for (const s of state.soundSessions || []) {
      const dt = new Date(s.startedAt); const day = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; // 현지 날짜 기준
      const rec = sounds[day] || (sounds[day] = [0, 0, {}]);
      rec[s.timeOfDay === "night" ? 1 : 0] += s.durationSec;
      rec[2][s.title] = (rec[2][s.title] || 0) + s.durationSec;
    }
    return {
      v: 1, id: p.id || "", n: p.nickname || "", s: p.startDate || "", at: new Date().toISOString(),
      done: Object.entries(state.progress || {}).filter(([, v]) => v === "completed").map(([k]) => k),
      w: ws,
      q: (state.questionnaires || []).map((r) => [r.type, r.timepoint, r.at, r.total, r.severity, Array.from({ length: 25 }, (_, i) => r.answers?.["q" + (i + 1)] ?? "").join("")]),
      d: diary,
      ss: Object.entries(sounds).sort().map(([day, r]) => [day, r[0], r[1], r[2]]),
    };
  };

  // 압축 표현 → 의료진 화면에서 쓰기 좋은 형태
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  T.expand = function (c) {
    const str = (v, n = 40) => String(v ?? "").slice(0, n);
    return {
      id: str(c.id, 20), nickname: str(c.n, 20), startDate: DATE_RE.test(c.s || "") ? c.s : "", receivedAt: str(c.at, 30), done: Array.isArray(c.done) ? c.done.map((d) => str(d, 40)) : [],
      worksheets: Object.fromEntries(Object.entries(c.w || {}).map(([id, o]) => [id, { single: o.s || {}, singleAt: o.t || null, entries: (o.e || []).map(([at, responses]) => ({ at, responses })) }])),
      questionnaires: (c.q || []).map(([type, timepoint, at, total, severity, answers]) => ({ type: str(type, 10), timepoint: ["baseline", "week8"].includes(timepoint) ? timepoint : "other", at: str(at, 30), total: Number(total) || 0, severity: str(severity, 20), answers: str(answers, 60) })),
      diary: Object.fromEntries((c.d || []).filter((r) => Array.isArray(r) && DATE_RE.test(r[0] || "")).map(([k, t, a, s, m, p, trigger, memo]) => [k, { tinnitus: t == null ? null : Number(t), annoyance: a == null ? null : Number(a), sleep: s == null ? null : Number(s), mindfulness: !!m, pmr: !!p, trigger: str(trigger, 200), memo: str(memo, 2000) }])),
      sounds: (c.ss || []).filter((r) => Array.isArray(r) && DATE_RE.test(r[0] || "")).map(([day, daySec, nightSec, byTitle]) => ({ day, daySec: Number(daySec) || 0, nightSec: Number(nightSec) || 0, byTitle: byTitle && typeof byTitle === "object" ? byTitle : {} })),
    };
  };

  // ---------- 바이트 ↔ 문자열 ----------
  const enc = new TextEncoder(), dec = new TextDecoder();
  function b64(bytes) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(str) { const s = atob(str); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }
  async function pump(stream, bytes) {
    const w = stream.writable.getWriter(); w.write(bytes); w.close();
    const chunks = []; const r = stream.readable.getReader();
    for (;;) { const { value, done } = await r.read(); if (done) break; chunks.push(value); }
    const total = chunks.reduce((a, c) => a + c.length, 0), out = new Uint8Array(total);
    let off = 0; for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
  }
  async function deflate(bytes) {
    if (typeof CompressionStream === "undefined") return { mode: "r", bytes };
    try { return { mode: "z", bytes: await pump(new CompressionStream("deflate-raw"), bytes) }; } catch (e) { return { mode: "r", bytes }; }
  }
  async function inflate(mode, bytes) {
    if (mode === "r") return bytes;
    if (typeof DecompressionStream === "undefined") throw new Error("이 브라우저는 압축 해제를 지원하지 않습니다.");
    return pump(new DecompressionStream("deflate-raw"), bytes);
  }

  // ---------- 프레임 ----------
  // 형식: T1|<세션id>|<번호>/<전체>|<z|r>|<base64 조각>
  T.encode = async function (state, opts = {}) {
    const c = T.compact(state);
    const { mode, bytes } = opts.raw ? { mode: "r", bytes: enc.encode(JSON.stringify(c)) } : await deflate(enc.encode(JSON.stringify(c)));
    const body = b64(bytes);
    const sid = Math.random().toString(36).slice(2, 6);
    const n = Math.max(1, Math.ceil(body.length / FRAME_PAYLOAD));
    const frames = [];
    for (let i = 0; i < n; i++) frames.push(`T1|${sid}|${i + 1}/${n}|${mode}|${body.slice(i * FRAME_PAYLOAD, (i + 1) * FRAME_PAYLOAD)}`);
    return { frames, bytes: bytes.length, sid };
  };
  T.parseFrame = function (text) {
    const m = /^T1\|([a-z0-9]+)\|(\d+)\/(\d+)\|([zr])\|([A-Za-z0-9+/=]*)$/.exec(String(text || "").trim());
    if (!m) return null;
    return { sid: m[1], i: Number(m[2]), n: Number(m[3]), mode: m[4], payload: m[5] };
  };
  // 조각 수집기: add(text) → {sid, got, n, complete}
  T.collector = function () {
    const sessions = new Map(); // sid → {n, mode, parts}  (두 폰이 번갈아 잡혀도 서로 지우지 않음)
    let doneSid = null;
    return {
      add(text) {
        const f = T.parseFrame(text); if (!f) return null;
        let s = sessions.get(f.sid);
        if (!s || s.n !== f.n) { s = { n: f.n, mode: f.mode, parts: {} }; sessions.set(f.sid, s); }
        s.parts[f.i] = f.payload;
        const got = Object.keys(s.parts).length;
        if (got === s.n) doneSid = f.sid;
        return { sid: f.sid, got, n: s.n, mode: s.mode, complete: got === s.n, missing: Array.from({ length: s.n }, (_, k) => k + 1).filter((k) => !s.parts[k]) };
      },
      canInflate(mode) { return mode === "r" || typeof DecompressionStream !== "undefined"; },
      async result() {
        const s = sessions.get(doneSid); if (!s) throw new Error("아직 모든 조각을 받지 못했습니다.");
        let body = ""; for (let i = 1; i <= s.n; i++) body += s.parts[i];
        const bytes = await inflate(s.mode, unb64(body));
        return JSON.parse(dec.decode(bytes));
      },
      reset() { sessions.clear(); doneSid = null; },
    };
  };

  root.Transfer = T;
})(typeof window !== "undefined" ? window : globalThis);
