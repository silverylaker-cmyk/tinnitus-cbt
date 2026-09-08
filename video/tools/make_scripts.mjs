// data/program.json → scripts/<moduleId>.json (나레이션 대본 + 연출 큐)
// 임상 문장은 절대 바꾸지 않는다. 앞뒤에 안내 문장(진행자 멘트)만 붙인다.
// 이미 있는 대본은 덮어쓰지 않는다 (--force 로 강제).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBody } from "../src/lib/sentences.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const P = JSON.parse(fs.readFileSync(path.join(ROOT, "..", "data", "program.json"), "utf8"));
const force = process.argv.includes("--force");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const KIND = { learn: "학습", write: "작성", homework: "숙제", assess: "확인", summary: "정리" };
const ORD = ["첫 번째", "두 번째", "세 번째", "네 번째", "다섯 번째", "여섯 번째"];
const eul = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? "을" : "를"; };
const example = (ph) => (ph || "").replace(/^예\s*:\s*/, "").split(/,\s*/)[0].replace(/^["“]|["”]$/g, "");

function cuesForScreen(m, screen, idx) {
  const cues = [];
  const cid = (k) => `s${idx}-${k}`;
  const { sentences } = parseBody(screen.title, screen.body);
  if (idx === 0) cues.push({ id: cid("intro"), say: `${m.week}주차 ${KIND[m.kind] || ""} 내용, '${m.title}'${eul(m.title)} 함께 보겠습니다.`, highlight: null });
  sentences.forEach((t, s) => cues.push({ id: cid(String(s).padStart(2, "0")), say: t, highlight: s }));
  if (screen.type === "worksheet") {
    (screen.fields || []).forEach((f, i) => {
      const ex = example(f.placeholder);
      cues.push({ id: cid(`f${i}`), say: `${ORD[i] || i + 1 + "번째"} 칸입니다. ${f.label}`, highlight: null, point: `textarea[data-key="${f.key}"]` });
      if (ex) cues.push({ id: cid(`f${i}t`), say: `예를 들면 이렇게 적을 수 있습니다. ${ex}`, highlight: null, type: { key: f.key, text: ex } });
    });
    cues.push({ id: cid("save"), say: `다 적었으면 아래 '${screen.button || "저장"}' 버튼을 누릅니다. 저장한 내용은 언제든 다시 열어 고칠 수 있습니다.`, highlight: null, point: "#next-btn", tap: true });
  } else if (screen.type === "questionnaire") {
    const q = P.questionnaires[screen.questionnaire_type];
    if (q?.instruction) cues.push({ id: cid("inst"), say: q.instruction, highlight: null, point: "#fields .card" });
    cues.push({ id: cid("q1"), say: `문항마다 '${q?.options?.map((o) => o.label).join("', '")}' 가운데 하나를 고릅니다.`, highlight: null, point: ".q-item .q-opts", tap: true });
    cues.push({ id: cid("submit"), say: `모든 문항에 답하면 아래 '${screen.button || "제출하기"}' 버튼을 누릅니다.`, highlight: null, point: "#next-btn", tap: true });
  } else {
    const last = idx === m.screens.length - 1;
    const label = screen.button || (last ? "완료" : "다음");
    cues.push({ id: cid("next"), say: last ? `여기까지 읽었으면 아래 '${label}' 버튼을 눌러 마무리합니다.` : `아래 '${label}' 버튼을 눌러 다음 화면으로 넘어갑니다.`, highlight: null, point: "#next-btn", tap: true });
  }
  return cues;
}

fs.mkdirSync(path.join(ROOT, "scripts"), { recursive: true });
let n = 0;
for (const m of P.modules) {
  if (only && m.id !== only) continue;
  const out = path.join(ROOT, "scripts", `${m.id}.json`);
  if (fs.existsSync(out) && !force) continue;
  const script = {
    module: m.id, week: m.week, title: m.title,
    _readme: "say = 읽을 문장 (TTS/육성). highlight = 화면 문장 번호(0=제목, 1..=본문, null=없음). point = 가리킬 요소(CSS 선택자). tap = 눌림 효과. type = {key,text} 입력칸에 타이핑. 임상 문장은 content/*.json 에서 고치고, 진행 멘트만 여기서 고치세요.",
    screens: m.screens.map((s, i) => ({ index: i, title: s.title, cues: cuesForScreen(m, s, i) })),
  };
  fs.writeFileSync(out, JSON.stringify(script, null, 1) + "\n");
  n++;
}
console.log(`scripts: ${n} written`);
