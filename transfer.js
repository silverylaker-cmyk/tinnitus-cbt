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
      if (w.single && Object.keys(w.single).length) o.s = w.single;
      if (w.entries && w.entries.length) o.e = w.entries.map((en) => [en.at, en.responses]);
      if (Object.keys(o).length) ws[id] = o;
    }
    const diary = Object.keys(state.diary || {}).filter((k) => state.diary[k] && state.diary[k].at).sort().map((k) => {
      const d = state.diary[k];
      return [k, d.tinnitus, d.annoyance, d.sleep, d.mindfulness ? 1 : 0, d.pmr ? 1 : 0, d.trigger || "", d.memo || ""];
    });
    const sounds = {};
    for (const s of state.soundSessions || []) {
      const day = s.startedAt.slice(0, 10);
      const rec = sounds[day] || (sounds[day] = [0, 0, {}]);
      rec[s.timeOfDay === "night" ? 1 : 0] += s.durationSec;
      rec[2][s.title] = (rec[2][s.title] || 0) + s.durationSec;
    }
    return {
      v: 1, id: p.id || "", n: p.nickname || "", s: p.startDate || "", at: new Date().toISOString(),
      done: Object.entries(state.progress || {}).filter(([, v]) => v === "completed").map(([k]) => k),
      w: ws,
      q: (state.questionnaires || []).map((r) => [r.type, r.timepoint, r.at, r.total, r.severity, Object.values(r.answers || {}).join("")]),
      d: diary,
      ss: Object.entries(sounds).sort().map(([day, r]) => [day, r[0], r[1], r[2]]),
    };
  };

  // 압축 표현 → 의료진 화면에서 쓰기 좋은 형태
  T.expand = function (c) {
    return {
      id: c.id, nickname: c.n, startDate: c.s, receivedAt: c.at, done: c.done || [],
      worksheets: Object.fromEntries(Object.entries(c.w || {}).map(([id, o]) => [id, { single: o.s || {}, entries: (o.e || []).map(([at, responses]) => ({ at, responses })) }])),
      questionnaires: (c.q || []).map(([type, timepoint, at, total, severity, answers]) => ({ type, timepoint, at, total, severity, answers })),
      diary: Object.fromEntries((c.d || []).map(([k, t, a, s, m, p, trigger, memo]) => [k, { tinnitus: t, annoyance: a, sleep: s, mindfulness: !!m, pmr: !!p, trigger, memo }])),
      sounds: (c.ss || []).map(([day, daySec, nightSec, byTitle]) => ({ day, daySec, nightSec, byTitle: byTitle || {} })),
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
  T.encode = async function (state) {
    const c = T.compact(state);
    const { mode, bytes } = await deflate(enc.encode(JSON.stringify(c)));
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
    let sid = null, n = 0, parts = {}, mode = "z";
    return {
      add(text) {
        const f = T.parseFrame(text); if (!f) return null;
        if (f.sid !== sid) { sid = f.sid; n = f.n; parts = {}; mode = f.mode; }
        parts[f.i] = f.payload;
        const got = Object.keys(parts).length;
        return { sid, got, n, complete: got === n, missing: Array.from({ length: n }, (_, k) => k + 1).filter((k) => !parts[k]) };
      },
      async result() {
        let body = ""; for (let i = 1; i <= n; i++) body += parts[i];
        const bytes = await inflate(mode, unb64(body));
        return JSON.parse(dec.decode(bytes));
      },
      reset() { sid = null; n = 0; parts = {}; },
    };
  };

  root.Transfer = T;
})(typeof window !== "undefined" ? window : globalThis);
