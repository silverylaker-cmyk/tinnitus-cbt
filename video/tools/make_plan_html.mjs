// scripts/*.json (v2) + narration_plan.mjs 의 META → ../docs/narration-plan.html (계획 + 전체 대본, 자체 완결 HTML)
// 사용: node tools/make_plan_html.mjs [출력경로]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBody } from "../src/lib/sentences.js";
import { META } from "./narration_plan.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const P = JSON.parse(fs.readFileSync(path.join(ROOT, "..", "data", "program.json"), "utf8"));
const OUT = process.argv[2] || path.join(ROOT, "..", "docs", "narration-plan.html");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const KIND = { learn: "학습", write: "작성", homework: "숙제", summary: "정리" };
const VIEW = { module: "모듈 화면", program: "프로그램 목록", today: "일기 탭", records: "기록 탭", sound: "소리 탭" };
const secs = (cues) => cues.reduce((a, c) => a + c.say.length / 4.5 + 0.6, 0);
const mmss = (s) => `${Math.floor(s / 60)}분 ${String(Math.round(s % 60)).padStart(2, "0")}초`;

const mods = P.modules.map((m) => {
  const f = path.join(ROOT, "scripts", `${m.id}.json`);
  const script = JSON.parse(fs.readFileSync(f, "utf8"));
  const cues = script.screens.flatMap((s) => s.cues);
  return { m, script, cues, secs: secs(cues) };
});
const totalCues = mods.reduce((a, x) => a + x.cues.length, 0);
const totalSecs = mods.reduce((a, x) => a + x.secs, 0);
const totalChars = mods.reduce((a, x) => a + x.cues.reduce((b, c) => b + c.say.length, 0), 0);

// 같은 문장이 여러 큐에 쓰인 경우 (한 번 만들어 복사 가능)
const dup = new Map();
for (const x of mods) for (const c of x.cues) { const k = c.say; if (!dup.has(k)) dup.set(k, []); dup.get(k).push(`${x.m.id}/${c.id}`); }
const dups = [...dup.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);
const uniqueSentences = dup.size;

// 그림 제안 모음
const images = [];
for (const x of mods) for (const s of x.script.screens) if (s.image) images.push({ mod: x.m, screen: s, image: s.image });

const stateDesc = (s) => {
  if (!s.state) return "";
  const st = s.state, parts = [];
  if (st.afterSave) parts.push("저장 직후(입력칸 비움, 아래에 기록 1건)");
  if (st.editing != null) parts.push(`${st.editing + 1}번째 기록 수정 중(칸에 내용 채워짐, 버튼 '수정한 내용 저장')`);
  if (st.single) parts.push("단일형 저장 뒤(칸 채워짐, '저장됨 · 시각')");
  if (st.values) parts.push(`일기 점수 ${st.values.tinnitus}/${st.values.annoyance}/${st.values.sleep}${st.mindfulness ? ", 마음챙김 체크" : ""}${st.pmr ? ", 근육이완 체크" : ""}${st.memo ? `, 메모 "${st.memo}"` : ""}`);
  if (st.diary) parts.push("일기 표에 예시 1행");
  if (st.worksheets) parts.push("워크시트 기록 1묶음");
  return parts.join(" · ");
};

function cueRows(x, s) {
  const scr = x.m.screens[s.index];
  const { sentences } = parseBody(scr.title, scr.body);
  return s.cues.map((c) => {
    const act = [];
    if (c.point) act.push(`<span class="sel">${esc(c.point)}</span>${c.tap ? " <b>누름</b>" : " 가리킴"}`);
    if (c.type) act.push(`<span class="type">타이핑 → ${esc(c.type.key)}: “${esc(c.type.text)}”</span>`);
    const hl = c.highlight == null ? "" : `<span class="hl">${c.highlight === 0 ? "제목" : c.highlight}</span> ${esc(sentences[c.highlight] || "")}`;
    return `<tr><td class="id">${esc(c.id)}</td><td class="say">${esc(c.say)}</td><td class="scr">${hl}</td><td class="act">${act.join("<br>")}</td></tr>`;
  }).join("");
}

const modeCls = (mode) => (mode === "요약" ? "m-skim" : mode === "상세" ? "m-full" : "m-mix");

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>이명 CBT 나레이션 계획·대본 v2</title>
<style>
:root{--ink:#141413;--bg:#F5F3EC;--acc:#C2542F;--sand:#E8C9B8;--mute:#6b6862;--line:#d9d5cc;--card:#fff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:16px 14px 80px}
h1{font-size:26px;margin:8px 0 4px}h2{font-size:20px;margin:36px 0 10px;padding-top:8px;border-top:2px solid var(--ink)}h3{font-size:17px;margin:26px 0 8px}h4{font-size:15px;margin:18px 0 6px;color:var(--mute)}
.meta{color:var(--mute);font-size:13px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:10px 0}
.stats{display:flex;flex-wrap:wrap;gap:10px}.stat{flex:1 1 140px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}.stat b{display:block;font-size:22px}.stat span{color:var(--mute);font-size:12px}
table{width:100%;border-collapse:collapse;font-size:13.5px;background:var(--card)}th,td{border:1px solid var(--line);padding:6px 8px;vertical-align:top;text-align:left}th{background:#efece3;font-weight:600}
td.id{white-space:nowrap;font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--mute)}td.say{min-width:260px;font-size:14.5px}td.scr{color:var(--mute);font-size:12.5px}td.act{font-size:12px;white-space:normal}
.sel{font-family:ui-monospace,Menlo,monospace;background:#efece3;padding:0 4px;border-radius:4px}.type{color:var(--acc)}.hl{display:inline-block;min-width:18px;text-align:center;background:var(--sand);border-radius:4px;font-size:11px;padding:0 4px;margin-right:4px}
.pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;border:1px solid var(--line);background:var(--card)}
.m-skim{background:#e8efe6;border-color:#b8cdb2}.m-full{background:#f8e3d9;border-color:#e2b8a4}.m-mix{background:#f3ecd2;border-color:#dccf9a}
.toc{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.toc a{text-decoration:none;color:var(--ink);border:1px solid var(--line);background:var(--card);padding:3px 9px;border-radius:999px;font-size:13px}
.screen{margin:14px 0}.screen-head{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;margin:6px 0}.screen-head .v{font-weight:600}.screen-head .st{color:var(--mute);font-size:12.5px}
pre{white-space:pre-wrap;background:#faf8f2;border:1px dashed var(--line);border-radius:8px;padding:10px;font-size:12.5px;line-height:1.5}
ol,ul{padding-left:20px}li{margin:3px 0}
.tablewrap{overflow-x:auto}
.note{font-size:13px;color:var(--mute)}
.top{position:fixed;right:12px;bottom:12px;background:var(--ink);color:#fff;text-decoration:none;padding:8px 12px;border-radius:999px;font-size:13px;opacity:.85}
@media print{.top{display:none}body{background:#fff}.card,table{break-inside:avoid}}
@media (max-width:640px){td.say{min-width:180px}table{font-size:12.5px}}
</style></head><body><div class="wrap">
<h1>이명 CBT 8주 나레이션 — 계획·대본 v2</h1>
<div class="meta">만든 날 ${new Date().toISOString().slice(0, 10)} · 원본 <code>video/tools/narration_plan.mjs</code> → <code>video/scripts/*.json</code> → 이 문서. 대본 편집기(<code>npm run editor</code>, 폰에서 http://192.168.123.108:8091)에서 같은 JSON을 고칠 수 있습니다.</div>

<div class="stats">
<div class="stat"><b>${mods.length}</b><span>모듈 (설문 2개 제외)</span></div>
<div class="stat"><b>${totalCues}</b><span>큐 = 육성 파일 수</span></div>
<div class="stat"><b>${uniqueSentences}</b><span>서로 다른 문장 (같은 문장은 복사 가능)</span></div>
<div class="stat"><b>${mmss(totalSecs)}</b><span>예상 나레이션 길이 (글자 수 ÷ 4.5/초 + 큐당 0.6초)</span></div>
<div class="stat"><b>${totalChars.toLocaleString()}</b><span>읽을 글자 수</span></div>
</div>

<h2 id="principles">1. 원칙</h2>
<div class="card">
<ol>
<li><b>드라마 영상에서 이미 다룬 화면은 다 읽지 않는다.</b> 제목을 짚고 “이 화면에는 ○○ 내용이 있습니다” 한 문장으로 요약한 뒤, “${esc(META.skimClose)}”로 넘긴다. (표에서 <span class="pill m-skim">요약</span>)</li>
<li><b>드라마에 없던 내용은 상세히.</b> 화면 문장을 그대로 읽으며(문장마다 강조), 앞뒤에 진행 멘트를 붙인다. 실습 도구(호흡 원, 근육이완 타이머, 호흡–단서어)는 어디를 누르고 무엇이 표시되는지, 마치면 일기에 자동 체크되는 것까지 설명한다. (<span class="pill m-full">상세</span>, 섞이면 <span class="pill m-mix">혼합</span>)</li>
<li><b>기록을 쓰는 화면은 세 가지 형식에 맞춰 설명한다.</b><br>
 · 누적형 워크시트(1·2·4주차): 칸마다 예시 타이핑 → 저장 → 아래에 기록이 쌓임 → 수정·삭제 → 더 적기 → ‘다음으로’ → 프로그램 탭에서 다시 열기 → 기록 탭.<br>
 · 단일형 워크시트(6·7·8주차): 저장하고 다음 → ‘저장됨 · 시각’ → 다시 열면 채워져 있음 → 고쳐서 다시 저장(6주차 적용 기록은 한 줄씩 덧붙이기) → 기록 탭 ‘열어서 고치기’.<br>
 · 일기(1주차에 전체, 3·5·7주차는 해당 칸만): 숫자 0~10 고르기 → 체크 → 계기·메모 → 저장 → 기록 탭 표에서 날짜/‘고치기’ → ‘전날’로 빠뜨린 날 쓰기.</li>
<li><b>그림이 들어가면 좋은 화면은 프롬프트를 남긴다.</b> (4절 · 각 모듈 대본 아래) 스타일은 기존 <code>docs/image-prompts.md</code>의 공통 블록을 그대로 쓴다.</li>
<li><b>읽을 문장(say)은 육성 TTS용으로 손질했다.</b> 숫자는 한글(“십오 분에서 이십 분”, “오후 세 시”), ‘~’는 ‘에서’, 줄표·가운뎃점·괄호는 쉼표, 화살표는 ‘그다음’, PMR은 ‘피엠알’. 화면 글자는 그대로이고 강조만 그 문장을 가리킨다. 마음에 안 드는 표현은 JSON의 say만 고치면 된다.</li>
<li><b>설문(THI)은 앱에서 뺐으므로 대본에도 없다.</b> 드라마 8주차 나레이션 원고의 ‘설문 다시 작성’ 문장은 쓰지 않는다.</li>
</ol>
</div>

<h2 id="drama">2. 드라마 영상 ↔ 웹앱 모듈 대응</h2>
<p class="note">기준: <code>~/mydrive/CBT</code>의 완성본(FINAL) mp4 9편 = 치료사·할머니 대화 장면. 4~8주차 원고의 나레이션(B·C) 부분(근육이완 순서, 축약 이완 3단계, 수면 위생, 야간 전략, 도구상자, 파도)은 영상 길이로 볼 때 제작되지 않았으므로 웹앱 나레이션에서 상세히 다룬다.</p>
<div class="tablewrap"><table><thead><tr><th>회차</th><th>제목</th><th>파일 · 길이</th><th>영상에서 다룬 내용</th></tr></thead><tbody>
${META.drama.map((d) => `<tr><td>${esc(d.id)}</td><td>${esc(d.title)}</td><td class="note">${esc(d.file)}<br>${esc(d.dur)}</td><td>${esc(d.covers)}${d.note ? `<br><span class="note">※ ${esc(d.note)}</span>` : ""}</td></tr>`).join("")}
</tbody></table></div>

<h3>모듈별 처리 방식</h3>
<div class="tablewrap"><table><thead><tr><th>주차</th><th>모듈</th><th>종류</th><th>드라마</th><th>방식</th><th>큐</th><th>예상 길이</th><th>비고</th></tr></thead><tbody>
${mods.map(({ m, cues, secs }) => { const c = META.coverage[m.id] || {}; return `<tr><td>${m.week}</td><td><a href="#${m.id}">${esc(m.title)}</a></td><td>${KIND[m.kind]}</td><td>${esc(c.drama || "—")}</td><td><span class="pill ${modeCls(c.mode)}">${esc(c.mode || "")}</span></td><td>${cues.length}</td><td>${mmss(secs)}</td><td class="note">${esc(c.note || "")}</td></tr>`; }).join("")}
</tbody></table></div>

<h2 id="workflow">3. 제작 흐름과 준비 작업</h2>
<div class="card"><h4>흐름 (영상은 아직 만들지 않음 — 대본 확정 → 육성 → 렌더)</h4><ol>${META.workflow.map((w) => `<li>${esc(w)}</li>`).join("")}</ol>
<p class="note">육성 파일 경로 예: <code>video/public/audio/voice/week1_homework/d0-save.wav</code>. 큐 id는 아래 대본 표의 첫 칸입니다.</p></div>
<div class="card"><h4>렌더 전에 보완할 것 (Phone.tsx — 대본에 새 장면이 들어 있음)</h4><ol>${META.prep.map((w) => `<li>${esc(w)}</li>`).join("")}</ol></div>
<div class="card"><h4>같은 문장이 여러 번 쓰인 경우 (한 번 만들어 복사)</h4>
<div class="tablewrap"><table><thead><tr><th>문장</th><th>횟수</th><th>쓰인 큐</th></tr></thead><tbody>
${dups.slice(0, 40).map(([say, ids]) => `<tr><td>${esc(say)}</td><td>${ids.length}</td><td class="note">${ids.map(esc).join(", ")}</td></tr>`).join("")}
</tbody></table></div></div>

<h2 id="images">4. 그림 프롬프트 (제안)</h2>
<p class="note">이미 있는 그림: 주차 대표 8장(img/week1~8.webp), 7주차 밤 개념 그림. 아래는 나레이션에서 상세히 다루는 화면에 추가하면 좋은 그림입니다. 생성 후 <code>img/</code>에 저장하고 알려 주시면 화면·영상에 연결합니다.</p>
<pre>[공통 스타일 블록]
${esc(META.style)}</pre>
${images.map(({ mod, screen, image }) => `<div class="card"><b>${esc(image.file)}</b> <span class="pill">${image.size}</span><br><span class="note">${mod.week}주차 · ${esc(mod.title)} · ${esc(image.use)}</span><pre>${esc(image.prompt)}</pre></div>`).join("")}

<h2 id="scripts">5. 주차별 대본</h2>
<div class="toc">${mods.map(({ m }) => `<a href="#${m.id}">${m.week}주 ${esc(m.title.length > 14 ? m.title.slice(0, 14) + "…" : m.title)}</a>`).join("")}</div>
<p class="note">표 읽는 법: <b>큐 id</b> = 육성 파일 이름 · <b>읽을 문장</b> = 녹음할 문장 · <b>화면 강조</b> = 그때 화면에서 밝게 표시되는 문장(번호는 화면 안 문장 번호, 제목=0) · <b>동작</b> = 손가락 포인터가 가리키거나 누르는 요소, 입력칸 타이핑.</p>

${[1, 2, 3, 4, 5, 6, 7, 8].map((w) => `<h3 id="week${w}">${w}주차 · ${esc(P.weeks[w - 1].title)} <span class="note">— ${esc(P.weeks[w - 1].subtitle)}</span></h3>` + mods.filter((x) => x.m.week === w).map(({ m, script, cues, secs }) => {
  const c = META.coverage[m.id] || {};
  return `<div class="card" id="${m.id}">
<div class="screen-head"><span class="v" style="font-size:16px">${esc(m.title)}</span><span class="pill">${KIND[m.kind]}</span><span class="pill ${modeCls(c.mode)}">${esc(c.mode || "")}</span><span class="st">드라마 ${esc(c.drama || "—")} · 큐 ${cues.length}개 · ${mmss(secs)}${c.note ? ` · ${esc(c.note)}` : ""}</span></div>
${script.screens.map((s, i) => {
  const scr = m.screens[s.index];
  const view = s.view || "module";
  const head = view === "module" && !s.state ? `화면 ${s.index + 1}/${m.screens.length} · ${esc(scr.title)}` : `${VIEW[view]}${view === "module" ? ` (화면 ${s.index + 1})` : ""}`;
  return `<div class="screen"><div class="screen-head"><span class="v">▸ ${head}</span>${s.state ? `<span class="st">상태: ${esc(stateDesc(s))}</span>` : ""}</div>
<div class="tablewrap"><table><thead><tr><th>큐 id</th><th>읽을 문장</th><th>화면 강조</th><th>동작</th></tr></thead><tbody>${cueRows({ m }, s)}</tbody></table></div>
${s.image ? `<div class="note">🖼 그림 제안: <b>${esc(s.image.file)}</b> — ${esc(s.image.use)} (4절 참조)</div>` : ""}</div>`;
}).join("")}
</div>`;
}).join("")).join("")}

<a class="top" href="#top" onclick="window.scrollTo(0,0);return false">맨 위로</a>
</div></body></html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`wrote ${OUT} (${(html.length / 1024).toFixed(0)} KB), ${mods.length} modules, ${totalCues} cues, ~${mmss(totalSecs)}`);
