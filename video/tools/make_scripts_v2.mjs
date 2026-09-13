// 나레이션 대본 v2: tools/narration_plan.mjs 의 계획 → scripts/<moduleId>.json (기존 큐 형식 그대로)
//   - 드라마 영상에서 다룬 화면은 요약(skim), 다루지 않은 화면·기록 작성·도구는 상세
//   - say 는 읽기용(TTS) 문장: 숫자 한글, ~ → 에서, 줄표·괄호 정리 (tools/lib/tts_text.mjs)
//   - highlight 는 화면 문장의 일부 문구로 찾는다(손으로 번호를 적지 않는다)
// 사용: node tools/make_scripts_v2.mjs [--only=<moduleId>] [--dry]
//   기존 scripts/*.json 은 .bak 으로 남긴다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBody } from "../src/lib/sentences.js";
import { tts, ttsLeftovers } from "./lib/tts_text.mjs";
import { META, PLAN } from "./narration_plan.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const P = JSON.parse(fs.readFileSync(path.join(ROOT, "..", "data", "program.json"), "utf8"));
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const dry = process.argv.includes("--dry");

const KIND = { learn: "학습", write: "작성", homework: "숙제", summary: "정리" };
const ORD = ["첫 번째", "두 번째", "세 번째", "네 번째", "다섯 번째", "여섯 번째"];
const eul = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? "을" : "를"; };
const example = (ph) => (ph || "").replace(/^예\s*:\s*/, "").split(/,\s*(?=[^)]*(?:\(|$))/)[0].replace(/^["“]|["”]$/g, "");

// ---------------------------------------------------------------- builder
class Builder {
  constructor(m) { this.m = m; this.screens = []; this.ids = new Set(); this.notes = []; }
  _id(id) { if (this.ids.has(id)) throw new Error(`${this.m.id}: 큐 id 중복 ${id}`); this.ids.add(id); return id; }
  cue(id, say, o = {}) {
    const c = { id: this._id(id), say: tts(say), highlight: o.hl ?? null };
    if (o.point) c.point = o.point;
    if (o.tap) c.tap = true;
    if (o.type) c.type = o.type;
    if (o.raw) c.say = say; // 이미 읽기용으로 쓴 문장
    return c;
  }
  // 모듈 화면 하나
  screen(idx, fn, extra = {}) {
    const s = this.m.screens[idx];
    if (!s) throw new Error(`${this.m.id}: 화면 ${idx} 없음`);
    const { sentences } = parseBody(s.title, s.body);
    const sc = { index: idx, title: s.title, cues: [] };
    if (extra.view) sc.view = extra.view;
    if (extra.state) sc.state = extra.state;
    const ctx = this._ctx(sc, s, sentences, idx);
    fn(ctx);
    if (extra.image) sc.image = extra.image;
    if (extra.note) sc.note = extra.note;
    this.screens.push(sc);
    return sc;
  }
  // 앱의 다른 화면(일기·기록·소리·프로그램 목록) 장면. index 는 되돌아갈 모듈 화면 번호
  scene(idx, view, state, fn, extra = {}) {
    const s = this.m.screens[idx];
    const { sentences } = parseBody(s.title, s.body);
    const sc = { index: idx, view, cues: [] };
    if (state) sc.state = state;
    if (extra.title) sc.title = extra.title;
    const ctx = this._ctx(sc, s, sentences, idx);
    fn(ctx);
    if (extra.image) sc.image = extra.image;
    if (extra.note) sc.note = extra.note;
    this.screens.push(sc);
    return sc;
  }
  _ctx(sc, s, sentences, idx) {
    const m = this.m, self = this;
    const add = (c) => (sc.cues.push(c), c);
    const H = (sub) => {
      if (typeof sub === "number") { if (sub >= sentences.length) throw new Error(`${m.id}/${idx}: 문장 번호 ${sub} 없음`); return sub; }
      const i = sentences.findIndex((t) => t.includes(sub));
      if (i < 0) throw new Error(`${m.id}/${idx}: 문장을 찾지 못함 "${sub}"\n  ${sentences.map((t, j) => j + ": " + t).join("\n  ")}`);
      return i;
    };
    const fieldSel = (key) => `textarea[data-key="${key}"]`;
    // "1." 처럼 번호만 있는 문장은 따로 읽지 않고 다음 문장 앞에 '첫째,' 로 붙인다 (강조는 다음 문장)
    const ORDN = ["", "첫째", "둘째", "셋째", "넷째", "다섯째", "여섯째"];
    const readList = (list) => {
      let prefix = "";
      for (const i of list) {
        const t = sentences[i];
        const mnum = t.match(/^(\d+)\.$/);
        if (mnum) { prefix = (ORDN[Number(mnum[1])] || mnum[1]) + ", "; continue; }
        add(self.cue(`s${idx}-${String(i).padStart(2, "0")}`, prefix + t, { hl: i }));
        prefix = "";
      }
    };
    const ctx = {
      m, s, idx, sentences, H, fields: s.fields || [],
      c: (id, say, o) => add(self.cue(`s${idx}-${id}`, say, o)),
      raw: (id, say, o) => add(self.cue(`s${idx}-${id}`, say, { ...o, raw: true })),
      intro: (label) => add(self.cue(`s${idx}-intro`, label || `${m.week}주차 ${KIND[m.kind] || ""} 내용, '${m.title}'${eul(m.title)} 함께 보겠습니다.`)),
      // 화면 문장을 그대로 읽기 (번호 또는 문구, 범위 [a,b])
      read: (...specs) => {
        const list = [];
        for (const sp of specs) {
          if (Array.isArray(sp)) { const a = H(sp[0]), b = H(sp[1]); for (let i = a; i <= b; i++) list.push(i); }
          else list.push(H(sp));
        }
        readList(list);
      },
      readAll: () => readList(sentences.map((_, i) => i)),
      // 드라마에서 다룬 화면: 제목을 짚고 요약만 말한 뒤, 집에서 반복 학습 안내
      skim: (summary, o = {}) => {
        add(self.cue(`s${idx}-skim1`, summary, { hl: 0 }));
        add(self.cue(`s${idx}-skim2`, o.close || META.skimClose, { hl: null }));
      },
      // 워크시트 칸 안내 + 예시 타이핑
      field: (i, o = {}) => {
        const f = (s.fields || [])[i]; if (!f) throw new Error(`${m.id}/${idx}: 칸 ${i} 없음`);
        const ex = o.example ?? example(f.placeholder);
        add(self.cue(`s${idx}-f${i}`, o.say || `${ORD[i] || i + 1 + "번째"} 칸입니다. ${f.label}`, { point: fieldSel(f.key) }));
        if (ex && !o.noType) add(self.cue(`s${idx}-f${i}t`, o.exampleSay || (i === 0 || o.first ? `예를 들면 이렇게 적을 수 있습니다. ${ex}` : ex), { type: { key: f.key, text: ex } }));
        if (o.after) add(self.cue(`s${idx}-f${i}a`, o.after, { point: fieldSel(f.key) }));
      },
      save: (say) => add(self.cue(`s${idx}-save`, say || `다 적었으면 아래 '${s.button || "저장"}' 버튼을 누릅니다.`, { point: "#next-btn", tap: true })),
      next: (say) => {
        const last = idx === m.screens.length - 1;
        const label = s.button || (last ? "완료" : "다음");
        add(self.cue(`s${idx}-next`, say || (last ? `여기까지 읽었으면 아래 '${label}' 버튼을 눌러 마무리합니다.` : `아래 '${label}' 버튼을 눌러 다음 화면으로 넘어갑니다.`), { point: "#next-btn", tap: true }));
      },
      // 다른 화면 장면용 큐 (접두어 자유)
      x: (id, say, o) => add(self.cue(id, say, o)),
      fieldSel,
      exampleOf: (i) => example((s.fields || [])[i]?.placeholder),
    };
    return ctx;
  }
  note(t) { this.notes.push(t); }
  build() {
    return {
      module: this.m.id, week: this.m.week, title: this.m.title,
      _readme: "say = 읽을 문장 (육성 TTS). highlight = 화면 문장 번호(0=제목, 1..=본문, null=없음). point = 가리킬 요소(CSS 선택자). tap = 눌림 효과. type = {key,text} 입력칸에 타이핑. view = module|program|today|records|sound. image = 삽화 제안(렌더에는 영향 없음). 임상 문장은 content/*.json 에서 고치고, 진행 멘트만 여기서 고치세요.",
      _v2: { coverage: META.coverage[this.m.id] || null, notes: this.notes },
      screens: this.screens,
    };
  }
}

// ---------------------------------------------------------------- run
fs.mkdirSync(path.join(ROOT, "scripts"), { recursive: true });
let n = 0, cueTotal = 0, chars = 0;
const report = [];
for (const m of P.modules) {
  if (only && m.id !== only) continue;
  const fn = PLAN[m.id];
  if (!fn) { console.error(`계획 없음: ${m.id}`); process.exitCode = 1; continue; }
  const b = new Builder(m);
  fn(b, { P, KIND, ORD, eul, example });
  const script = b.build();
  // 검증
  const allowedViews = ["module", "program", "today", "records", "sound"];
  for (const sc of script.screens) {
    if (sc.view && !allowedViews.includes(sc.view)) throw new Error(`${m.id}: view ${sc.view}`);
    for (const c of sc.cues) {
      const left = ttsLeftovers(c.say);
      if (left.length) report.push(`${m.id} ${c.id}: 읽기 검토 ${left.join("")} — ${c.say}`);
      cueTotal++; chars += c.say.length;
    }
  }
  const out = path.join(ROOT, "scripts", `${m.id}.json`);
  if (!dry) {
    if (fs.existsSync(out)) fs.copyFileSync(out, out + ".bak");
    fs.writeFileSync(out, JSON.stringify(script, null, 1) + "\n");
  } else if (only) {
    for (const sc of script.screens) { console.log(`--- [${sc.view || "module"} #${sc.index}] ${sc.title || ""}`); for (const c of sc.cues) console.log(`${c.id}\t${c.highlight ?? "-"}\t${c.point || ""}${c.tap ? " (tap)" : ""}${c.type ? " (type)" : ""}\n\t${c.say}`); }
  }
  n++;
}
if (report.length) console.log(report.join("\n"));
console.log(`scripts v2: ${n} modules, ${cueTotal} cues, ${chars} chars (~${Math.round(chars / 4.5 / 60)} min of speech)${dry ? " [dry]" : ""}`);
