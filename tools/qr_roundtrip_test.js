// 사용법: node tools/qr_roundtrip_test.js "$(pwd)"  — 8주치 가짜 기록을 QR 조각으로 만들고 jsQR로 다시 읽어 조립되는지 확인
// QR 왕복 테스트: 상태 → 프레임 → QR 모듈 → 픽셀 → jsQR → 조립 → 비교
const path = require("path");
const W = process.argv[2];
require(path.join(W, "transfer.js"));
const qrcode = require(path.join(W, "vendor/qrcode.min.js"));
const jsQR = require(path.join(W, "vendor/jsQR.js"));
const T = globalThis.Transfer;

// 8주치 가짜 상태
const state = { profile: { id: "ab12cd", nickname: "홍길동", startDate: "2026-07-01", unlockAll: false }, progress: {}, worksheets: {}, questionnaires: [], diary: {}, soundSessions: [] };
for (let i = 0; i < 56; i++) {
  const d = new Date(2026, 6, 1 + i); const k = d.toISOString().slice(0, 10);
  state.diary[k] = { tinnitus: 3 + (i % 5), annoyance: 2 + (i % 6), sleep: 1 + (i % 4), mindfulness: i % 2 === 0, pmr: i % 3 === 0, trigger: i % 4 === 0 ? "카페인, 피로" : "", memo: i % 5 === 0 ? "PMR 20분, 긴장도 7 → 3. 밤에 이명이 조금 신경 쓰였지만 사운드 켜고 잠듦" : "", at: d.toISOString() };
  for (let s = 0; s < 2; s++) state.soundSessions.push({ soundId: "rain", title: "빗소리", startedAt: d.toISOString(), endedAt: d.toISOString(), durationSec: 1800 + s * 600, timeOfDay: s ? "night" : "day" });
}
const long = "밤 11시, 침대에 누워 잠들려던 참에 이명이 평소보다 크게 들렸다. 오늘도 이 소리 때문에 못 자겠다는 생각이 들어 불안 7, 짜증 5 정도였다.";
state.worksheets.week1_worksheet = { single: {}, entries: [{ at: "2026-07-02T10:00:00Z", responses: { trigger_situation: long, automatic_thought: long, emotion: "불안, 짜증", body_reaction: "어깨가 긴장됨" } }] };
state.worksheets.week2_worksheet = { single: {}, entries: Array.from({ length: 12 }, (_, i) => ({ at: `2026-07-${10 + i}T10:00:00Z`, responses: { situation: long, automatic_thought: long, emotion_intensity: "불안 7", pattern_found: "최악을 예상하기" } })) };
state.worksheets.week4_worksheet = { single: {}, entries: Array.from({ length: 4 }, (_, i) => ({ at: `2026-07-2${i}T10:00:00Z`, responses: { belief: long, prediction: long, experiment_plan: long, actual_result: long, learning: long } })) };
for (const id of ["week6_worksheet", "week7_worksheet", "week8_worksheet", "week8_act"]) state.worksheets[id] = { single: { a: long, b: long, c: long, d: long }, entries: [] };
const ans = {}; for (let i = 1; i <= 25; i++) ans["q" + i] = [0, 2, 4][i % 3];
state.questionnaires = [{ type: "THI", timepoint: "baseline", at: "2026-07-01T10:00:00Z", answers: ans, total: 52, severity: "moderate" }, { type: "THI", timepoint: "week8", at: "2026-08-26T10:00:00Z", answers: ans, total: 30, severity: "mild" }];
for (let i = 1; i <= 35; i++) state.progress["m" + i] = "completed";

(async () => {
  const { frames, bytes } = await T.encode(state);
  console.log("compact json bytes:", JSON.stringify(T.compact(state)).length, "→ deflate:", bytes, "→ frames:", frames.length, "frame len:", frames[0].length);
  const col = T.collector();
  let status;
  for (const f of frames.slice().reverse()) { // 역순으로 읽어도 조립되는지
    const qr = qrcode(0, "M"); qr.addData(f, "Byte"); qr.make();
    const n = qr.getModuleCount(), scale = 3, quiet = 4, size = (n + quiet * 2) * scale;
    const img = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) {
      for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) {
        const px = ((r + quiet) * scale + y) * size + (c + quiet) * scale + x;
        img[px * 4] = img[px * 4 + 1] = img[px * 4 + 2] = 0;
      }
    }
    const res = jsQR(img, size, size);
    if (!res) throw new Error("jsQR 디코드 실패 (modules " + n + ")");
    if (res.data !== f) throw new Error("프레임 불일치");
    status = col.add(res.data);
    console.log(`frame decoded: modules=${n} version=${(n - 17) / 4} got ${status.got}/${status.n}`);
  }
  if (!status.complete) throw new Error("incomplete");
  const back = await col.result();
  const same = JSON.stringify(T.compact(state), (k, v) => k === "at" && typeof v === "string" && v.length > 20 && k === "at" ? v : v) ;
  const a = T.compact(state); a.at = back.at;
  if (JSON.stringify(a) !== JSON.stringify(back)) throw new Error("roundtrip mismatch");
  const ex = T.expand(back);
  console.log("roundtrip OK · diary days", Object.keys(ex.diary).length, "· worksheets", Object.keys(ex.worksheets).length, "· THI", ex.questionnaires.length, "· sound days", ex.sounds.length);
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
