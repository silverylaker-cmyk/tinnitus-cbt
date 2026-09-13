// 육성 파일이 없는 큐 → 녹음용 HTML (읽을 문장 + 저장할 파일 이름, 복사 버튼)
// 사용: node tools/make_missing_html.mjs [출력경로]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "docs", "narration-missing.html");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const P = JSON.parse(fs.readFileSync(path.join(ROOT, "..", "data", "program.json"), "utf8"));

// 파일 이름은 NNN_<모듈>_<큐id>.wav. 이미 있는 파일 번호와 겹치지 않도록, 있는 개수 다음 번호부터 매긴다
// (번호는 사람이 알아보기 위한 것일 뿐, 정리할 때는 모듈·큐 id 만 씁니다)
const order = P.modules.map((m) => m.id);
const missing = [];
let have = 0;
for (const id of order) {
  const f = path.join(ROOT, "scripts", `${id}.json`);
  if (!fs.existsSync(f)) continue;
  const script = JSON.parse(fs.readFileSync(f, "utf8"));
  const dir = path.join(ROOT, "public", "audio", "voice", id);
  for (const sc of script.screens) for (const c of sc.cues) {
    const has = ["wav", "mp3", "m4a"].some((e) => fs.existsSync(path.join(dir, `${c.id}.${e}`)));
    if (has) have++;
    else missing.push({ mod: id, week: script.week, title: script.title, cue: c.id, say: c.say, view: sc.view || "module" });
  }
}
const rows = missing.map((r, i) => ({ ...r, num: String(have + i + 1).padStart(3, "0") }));

const VIEW = { module: "모듈 화면", program: "프로그램 목록", today: "일기 탭", records: "기록 탭", sound: "소리 탭" };
const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>녹음이 필요한 문장</title>
<style>
:root{--ink:#141413;--bg:#F5F3EC;--acc:#C2542F;--mute:#6b6862;--line:#d9d5cc;--card:#fff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif}
.wrap{max-width:760px;margin:0 auto;padding:18px 14px 70px}
h1{font-size:24px;margin:6px 0 4px}.meta{color:var(--mute);font-size:14px;margin-bottom:18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:12px 0}
.head{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;margin-bottom:8px;font-size:13px;color:var(--mute)}
.pill{background:#efece3;border-radius:999px;padding:2px 10px}
.say{font-size:19px;line-height:1.6;margin:10px 0 14px}
.file{font-family:ui-monospace,Menlo,monospace;font-size:13px;background:#faf8f2;border:1px dashed var(--line);border-radius:8px;padding:8px 10px;word-break:break-all}
.btns{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
button{font:inherit;font-size:14px;padding:9px 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);cursor:pointer}
button.primary{background:var(--ink);color:#fff;border-color:var(--ink)}
button.done{background:#e8efe6;border-color:#b8cdb2}
.steps{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.steps ol{margin:6px 0 0;padding-left:20px}.steps li{margin:4px 0}
.empty{text-align:center;color:var(--mute);padding:40px 0}
</style></head><body><div class="wrap">
<h1>녹음이 필요한 문장 ${rows.length}개</h1>
<div class="meta">만든 날 ${new Date().toISOString().slice(0, 10)} · 대본 v2 기준</div>
<div class="steps"><b>하는 법</b>
<ol>
<li>문장을 <b>복사</b> 눌러 쓰시는 TTS 에 붙여 넣고 음성을 만드세요.</li>
<li>내려받은 파일 이름을 아래 <b>파일 이름</b>으로 바꿉니다 (파일 이름 복사 버튼).</li>
<li><code>mydrive/CBT/나레이션</code> 폴더에 넣어 주세요. 나머지는 제가 처리합니다.</li>
</ol></div>
${rows.length ? rows.map((r) => `
<div class="card" data-cue="${esc(r.cue)}">
  <div class="head"><span class="pill">${r.week}주차</span><span>${esc(r.title)}</span><span class="pill">${VIEW[r.view]}</span><span>${esc(r.cue)}</span></div>
  <div class="say">${esc(r.say)}</div>
  <div class="file">${r.num}_${esc(r.mod)}_${esc(r.cue)}.wav</div>
  <div class="btns">
    <button class="primary" data-copy="${esc(r.say)}">문장 복사</button>
    <button data-copy="${r.num}_${esc(r.mod)}_${esc(r.cue)}.wav">파일 이름 복사</button>
  </div>
</div>`).join("") : `<div class="empty">빠진 문장이 없습니다. 모든 큐에 음성이 있습니다.</div>`}
<script>
document.querySelectorAll("button[data-copy]").forEach((b) => b.onclick = async () => {
  const t = b.dataset.copy;
  try { await navigator.clipboard.writeText(t); }
  catch (e) { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
  const old = b.textContent; b.textContent = "복사됨 ✓"; b.classList.add("done");
  setTimeout(() => { b.textContent = old; b.classList.remove("done"); }, 1400);
});
</script>
</div></body></html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`wrote ${OUT} — ${rows.length} missing cues`);
