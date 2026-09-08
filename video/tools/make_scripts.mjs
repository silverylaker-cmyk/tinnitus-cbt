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
  if (m.id === "week1_psychoeducation" && idx === 0) {
    cues.push({ id: cid("tts1"), say: "글을 읽기 힘들 때는 제목 아래 '소리로 듣기' 버튼을 누르세요. 화면의 글을 읽어 줍니다.", highlight: null, point: "#tts-btn", tap: true });
    cues.push({ id: cid("tts2"), say: "한 번 더 누르면 읽기를 멈춥니다. 모든 화면에 같은 버튼이 있습니다.", highlight: null, point: "#tts-btn" });
  }
  sentences.forEach((t, s) => cues.push({ id: cid(String(s).padStart(2, "0")), say: t, highlight: s }));
  if (screen.type === "worksheet") {
    (screen.fields || []).forEach((f, i) => {
      const ex = example(f.placeholder);
      cues.push({ id: cid(`f${i}`), say: `${ORD[i] || i + 1 + "번째"} 칸입니다. ${f.label}`, highlight: null, point: `textarea[data-key="${f.key}"]` });
      if (ex) cues.push({ id: cid(`f${i}t`), say: i === 0 ? `예를 들면 이렇게 적을 수 있습니다. ${ex}` : ex, highlight: null, type: { key: f.key, text: ex } });
    });
    cues.push({ id: cid("save"), say: `다 적었으면 아래 '${screen.button || "저장"}' 버튼을 누릅니다.`, highlight: null, point: "#next-btn", tap: true });
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

// 저장 뒤: 기록이 쌓인 화면 → 프로그램 목록에서 다시 들어가는 길
function afterSaveScenes(m, screen, idx) {
  const responses = {};
  for (const f of screen.fields || []) { const ex = example(f.placeholder); if (ex) responses[f.key] = ex; }
  return [
    { index: idx, view: "module", state: { afterSave: true, entries: [{ when: "오늘", responses }] }, cues: [
      { id: `a${idx}-saved`, say: "저장하면 방금 쓴 내용이 아래에 기록으로 남고, 입력칸은 비워집니다.", highlight: null, point: "#entries .entry" },
      { id: `a${idx}-edit`, say: "기록 옆의 '수정'을 누르면 다시 고쳐 쓸 수 있고, '삭제'로 지울 수도 있습니다.", highlight: null, point: "[data-edit]", tap: true },
      { id: `a${idx}-more`, say: "더 적고 싶으면 빈 칸에 새로 적고 다시 저장하면 기록이 하나 더 쌓입니다.", highlight: null, point: 'textarea[data-key="' + (screen.fields?.[0]?.key || "") + '"]' },
      { id: `a${idx}-next`, say: "칸이 비어 있으면 아래 버튼이 '다음으로'로 바뀝니다. 눌러서 다음 내용으로 넘어갑니다.", highlight: null, point: "#next-btn", tap: true },
    ] },
    { index: idx, view: "program", cues: [
      { id: `p${idx}-open`, say: `나중에 다시 쓰고 싶으면 '프로그램' 탭에서 ${m.week}주차의 '${m.title}'${eul(m.title)} 다시 엽니다.`, highlight: null, point: `[data-mod="${m.id}"]`, tap: true },
      { id: `p${idx}-list`, say: "이미 쓴 기록은 그 화면 아래에 모여 있고, 새로 적어 저장하면 하나 더 쌓입니다.", highlight: null },
      { id: `p${idx}-rec`, say: "'기록' 탭에서도 지금까지 쓴 기록을 한꺼번에 볼 수 있습니다.", highlight: null, point: '[data-route="records"]', tap: true },
    ] },
  ];
}

fs.mkdirSync(path.join(ROOT, "scripts"), { recursive: true });
let n = 0;
for (const m of P.modules) {
  if (only && m.id !== only) continue;
  const out = path.join(ROOT, "scripts", `${m.id}.json`);
  if (fs.existsSync(out)) { if (!force) continue; fs.copyFileSync(out, out + ".bak"); } // 덮어쓸 때는 .bak 남김
  const script = {
    module: m.id, week: m.week, title: m.title,
    _readme: "say = 읽을 문장 (TTS/육성). highlight = 화면 문장 번호(0=제목, 1..=본문, null=없음). point = 가리킬 요소(CSS 선택자). tap = 눌림 효과. type = {key,text} 입력칸에 타이핑. 임상 문장은 content/*.json 에서 고치고, 진행 멘트만 여기서 고치세요.",
    screens: m.screens.map((s, i) => ({ index: i, title: s.title, cues: cuesForScreen(m, s, i) })),
  };
  const ws = m.screens.findIndex((s) => s.type === "worksheet" && s.mode === "append");
  if (ws >= 0) script.screens.push(...afterSaveScenes(m, m.screens[ws], ws));
  fs.writeFileSync(out, JSON.stringify(script, null, 1) + "\n");
  n++;
}
console.log(`scripts: ${n} written`);
