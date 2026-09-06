/* 이명 관리 프로그램 — 정적 웹앱 (백엔드 없음, 기록은 이 기기의 localStorage에 저장) */
"use strict";

// =====================================================================
//  저장소
// =====================================================================
const STORE_KEY = "tinnitus_cbt_v1";
const DEFAULT_STATE = () => ({
  version: 1,
  profile: { startDate: null, nickname: "", unlockAll: false },
  progress: {},        // moduleId -> "in_progress" | "completed"
  worksheets: {},      // moduleId -> { single: {key: text}, entries: [{at, responses}] }
  questionnaires: [],  // {type, timepoint, at, answers, total, severity}
  diary: {},           // "YYYY-MM-DD" -> {tinnitus, annoyance, sleep, mindfulness, pmr, trigger, memo, at}
  soundSessions: [],   // {soundId, title, startedAt, endedAt, durationSec, timeOfDay}
});

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return DEFAULT_STATE();
    const s = JSON.parse(raw);
    return Object.assign(DEFAULT_STATE(), s, { profile: Object.assign(DEFAULT_STATE().profile, s.profile || {}) });
  } catch (e) { return DEFAULT_STATE(); }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast("저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요."); }
}

// =====================================================================
//  유틸
// =====================================================================
const P = window.PROGRAM;
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDate = (key) => { const [y, m, d] = key.split("-"); return `${y}년 ${Number(m)}월 ${Number(d)}일`; };
const fmtDateTime = (iso) => { const d = new Date(iso); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const weekdayKo = ["일", "월", "화", "수", "목", "금", "토"];

let toastTimer = null;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

// 원고 본문(줄바꿈 텍스트) → HTML. 빈 줄로 문단 구분, "- " 목록, "1. " 번호 목록, 따옴표만 있는 문단은 인용.
function renderBody(text) {
  if (!text) return "";
  return text.split(/\n\s*\n/).map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return "";
    let lead = "";
    let items = lines;
    if (lines.length > 1 && /[:：]$/.test(lines[0]) && lines.slice(1).every((l) => /^(- |\d+\. )/.test(l))) {
      lead = `<strong class="lead">${esc(lines[0])}</strong>`;
      items = lines.slice(1);
    }
    if (items.every((l) => /^- /.test(l))) {
      return lead + `<ul>${items.map((l) => `<li>${esc(l.slice(2))}</li>`).join("")}</ul>`;
    }
    if (items.every((l) => /^\d+\. /.test(l))) {
      return lead + `<ol>${items.map((l) => `<li>${esc(l.replace(/^\d+\. /, ""))}</li>`).join("")}</ol>`;
    }
    if (lines.length === 1 && /^["“].+["”]$/.test(lines[0])) {
      return `<blockquote>${esc(lines[0])}</blockquote>`;
    }
    return `<p>${lines.map(esc).join("<br>")}</p>`;
  }).join("");
}

// =====================================================================
//  프로그램 진행 상태
// =====================================================================
function daysSinceStart() {
  if (!state.profile.startDate) return null;
  const start = new Date(state.profile.startDate + "T00:00:00");
  return Math.floor((new Date() - start) / 86400000);
}
function currentWeek() {
  const d = daysSinceStart();
  if (d === null || d < 0) return 1;
  return Math.min(P.totalWeeks, Math.floor(d / 7) + 1);
}
function isWeekOpen(w) { return state.profile.unlockAll || w <= currentWeek(); }
const modulesOfWeek = (w) => P.modules.filter((m) => m.week === w);
const moduleById = (id) => P.modules.find((m) => m.id === id);
const modStatus = (id) => state.progress[id] || "not_started";
function setStatus(id, st) {
  if (st === "completed" || modStatus(id) !== "completed") { state.progress[id] = st; save(); }
}
function weekDone(w) { return modulesOfWeek(w).every((m) => modStatus(m.id) === "completed"); }
function completedCount() { return P.modules.filter((m) => modStatus(m.id) === "completed").length; }

const KIND_LABEL = { learn: "학습", write: "워크시트", homework: "숙제", assess: "평가", summary: "정리" };

// =====================================================================
//  라우터
// =====================================================================
const routes = {
  "": renderHome, home: renderHome, program: renderProgram, module: renderModule,
  today: renderToday, sound: renderSound, records: renderRecords, settings: renderSettings, results: renderResults,
};
function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [name, ...rest] = hash.split("/");
  const fn = routes[name] || renderHome;
  const main = $("#main");
  stopTTS();
  main.innerHTML = "";
  fn(main, rest);
  document.querySelectorAll(".nav a").forEach((a) => {
    const r = a.dataset.route;
    a.classList.toggle("active", r === (name || "home") || (name === "module" && r === "program") || (name === "results" && r === "records"));
  });
  window.scrollTo({ top: 0 });
}
window.addEventListener("hashchange", route);
window.addEventListener("load", route);

// =====================================================================
//  홈
// =====================================================================
function renderHome(main) {
  const started = !!state.profile.startDate;
  const w = currentWeek();
  const today = state.diary[dateKey()];
  const name = state.profile.nickname ? `${esc(state.profile.nickname)}님, ` : "";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "좋은 아침입니다" : hour < 18 ? "안녕하세요" : "편안한 저녁입니다";

  if (!started) {
    main.innerHTML = `
      <section class="hero">
        <div class="eyebrow">이명 인지행동치료</div>
        <h1>이명과 함께,<br>원하는 삶으로.</h1>
        <p class="lead">${esc(P.name)}은 이명 소리에 대한 반응을 바꾸어 이명과 편안하게 지내는 방법을 익히는 과정입니다. 하루 10~15분이면 충분합니다.</p>
      </section>
      <div class="grid">
        <div class="card"><div class="eyebrow">매주</div><h3>짧은 학습과 실습</h3><p class="muted">매주 새로운 내용이 열리고 워크시트로 직접 적어봅니다.</p></div>
        <div class="card"><div class="eyebrow">매일</div><h3>1분 일기</h3><p class="muted">이명의 크기와 신경 쓰인 정도를 기록해 나만의 패턴을 찾습니다.</p></div>
        <div class="card"><div class="eyebrow">언제든</div><h3>소리 치료</h3><p class="muted">클리닉에서 안내받은 소리를 재생하면 사용 시간이 기록됩니다.</p></div>
      </div>
      <div class="card tint" style="margin-top:24px">
        <h3>프로그램 시작</h3>
        <p class="muted">시작일을 기준으로 매주 다음 내용이 열립니다. 클리닉에서 안내받은 날짜가 있다면 그 날짜로 맞춰 주세요.</p>
        <label class="field"><span class="label">시작일</span><input type="date" id="start-date" value="${dateKey()}"></label>
        <label class="field"><span class="label">이름 또는 별칭 (선택)</span><input type="text" id="nickname" placeholder="예: 홍길동" maxlength="20"></label>
        <button class="btn accent" id="start-btn">시작하기</button>
      </div>`;
    $("#start-btn").onclick = () => {
      const v = $("#start-date").value;
      if (!v) return toast("시작일을 선택해 주세요.");
      state.profile.startDate = v;
      state.profile.nickname = $("#nickname").value.trim();
      save(); route();
    };
    return;
  }

  const mods = modulesOfWeek(w);
  const next = mods.find((m) => modStatus(m.id) !== "completed");
  const weekInfo = P.weeks[w - 1];
  const done = completedCount();
  const pct = Math.round((done / P.modules.length) * 100);
  const allDone = done === P.modules.length;
  const crisis = state.worksheets["week8_worksheet"]?.single;

  main.innerHTML = `
    <section class="hero">
      <div class="eyebrow">${weekdayKo[new Date().getDay()]}요일 · ${fmtDate(dateKey())}</div>
      <h1>${name}${greet}.</h1>
      <p class="lead">${allDone ? "8주 과정을 모두 마쳤습니다. 도구상자는 언제든 다시 열어볼 수 있습니다." : `지금은 <b>${w}주차</b>, ${esc(weekInfo.title)} 주간입니다.`}</p>
    </section>

    <div class="grid">
      <a class="card" href="#/${next ? "module/" + next.id : "program"}">
        <div class="eyebrow">이번 주 프로그램</div>
        <h3>${next ? esc(next.title) : "이번 주 내용을 모두 마쳤습니다"}</h3>
        <p class="muted small">${next ? KIND_LABEL[next.kind] + " · 이어서 진행하기" : "프로그램 목록에서 지난 내용을 다시 볼 수 있습니다"}</p>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <div class="small muted">전체 ${done} / ${P.modules.length} 완료</div>
      </a>
      <a class="card ${today ? "" : "accent"}" href="#/today">
        <div class="eyebrow">오늘의 일기</div>
        <h3>${today ? "오늘 기록을 마쳤습니다" : "아직 기록하지 않았어요"}</h3>
        ${today ? `<p class="muted small">이명 크기 ${today.tinnitus} · 괴로움 ${today.annoyance} · 수면 영향 ${today.sleep}</p>` : `<p class="muted small">1분이면 충분합니다. 이명 크기와 신경 쓰인 정도를 남겨 주세요.</p>`}
      </a>
      <a class="card" href="#/sound">
        <div class="eyebrow">소리 치료</div>
        <h3>사운드 재생</h3>
        <p class="muted small">${soundSummaryLine()}</p>
      </a>
    </div>

    ${crisis && Object.keys(crisis).length ? `
    <section class="section">
      <div class="section-head"><h2>나의 위기 대응 카드</h2><a class="more" href="#/module/week8_worksheet">수정하기</a></div>
      <div class="card tint">${renderCrisisCard(crisis)}</div>
    </section>` : ""}

    <section class="section">
      <div class="section-head"><h2>${w}주차 · ${esc(weekInfo.title)}</h2><a class="more" href="#/program">전체 프로그램</a></div>
      <div class="card">${renderModuleList(mods)}</div>
    </section>`;
}

function renderCrisisCard(c) {
  const labels = { warning_signs: "나의 경고 신호", first_action: "첫 번째 행동", helpful_thoughts: "효과 있었던 생각", backup_plan: "그래도 힘들면" };
  return Object.entries(labels).filter(([k]) => c[k]).map(([k, l]) => `<p><span class="eyebrow" style="display:block;margin:0">${l}</span>${esc(c[k])}</p>`).join("");
}

function soundSummaryLine() {
  const weekAgo = Date.now() - 7 * 86400000;
  const secs = state.soundSessions.filter((s) => new Date(s.startedAt) >= weekAgo).reduce((a, s) => a + s.durationSec, 0);
  if (!secs) return "최근 7일 사용 기록이 없습니다";
  return `최근 7일 ${(secs / 3600).toFixed(1)}시간 사용`;
}

function renderModuleList(mods) {
  return mods.map((m) => {
    const st = modStatus(m.id);
    const cls = st === "completed" ? "done" : st === "in_progress" ? "doing" : "";
    const mark = st === "completed" ? "✓" : st === "in_progress" ? "…" : "";
    return `<a class="mod ${cls} ${m.kind === "write" ? "write" : ""}" href="#/module/${m.id}">
      <span class="dot">${mark}</span>
      <span class="t">${esc(m.title)}</span>
      <span class="kind">${KIND_LABEL[m.kind]}</span></a>`;
  }).join("");
}

// =====================================================================
//  프로그램 목록
// =====================================================================
function renderProgram(main) {
  if (!state.profile.startDate) { location.hash = "#/"; return; }
  const cw = currentWeek();
  main.innerHTML = `
    <section class="hero" style="padding-bottom:20px">
      <div class="eyebrow">8주 프로그램</div>
      <h1>프로그램 목록</h1>
      <p class="lead">시작일 ${fmtDate(state.profile.startDate)} 기준, 현재 ${cw}주차입니다. ${state.profile.unlockAll ? "모든 주차가 열려 있습니다." : "다음 주차는 7일마다 자동으로 열립니다."}</p>
    </section>
    <div id="weeks"></div>`;
  const wrap = $("#weeks");
  P.weeks.forEach((wk) => {
    const open = isWeekOpen(wk.week);
    const mods = modulesOfWeek(wk.week);
    const doneN = mods.filter((m) => modStatus(m.id) === "completed").length;
    const expanded = open && (wk.week === cw || (doneN > 0 && doneN < mods.length));
    const div = document.createElement("div");
    div.className = "week" + (open ? "" : " locked");
    div.innerHTML = `
      <button class="week-head" aria-expanded="${expanded}" ${open ? "" : "disabled"}>
        <span class="week-num">WEEK ${wk.week}</span>
        <span class="week-title"><h3>${esc(wk.title)}</h3><span class="sub">${esc(wk.subtitle)}</span></span>
        <span class="week-status">${open ? (doneN === mods.length ? "완료" : `${doneN}/${mods.length}`) : "잠김"}</span>
      </button>
      <div class="week-body" ${expanded ? "" : "hidden"}>${renderModuleList(mods)}</div>`;
    const head = $(".week-head", div), body = $(".week-body", div);
    head.onclick = () => { body.hidden = !body.hidden; head.setAttribute("aria-expanded", String(!body.hidden)); };
    wrap.appendChild(div);
  });
}

// =====================================================================
//  모듈 뷰어 (나레이션 / 워크시트 / 설문)
// =====================================================================
let viewer = null;

function renderModule(main, [id, idxStr]) {
  const m = moduleById(id);
  if (!m) { location.hash = "#/program"; return; }
  if (!isWeekOpen(m.week)) { toast("아직 열리지 않은 주차입니다."); location.hash = "#/program"; return; }
  const idx = Math.min(Math.max(Number(idxStr) || 0, 0), m.screens.length - 1);
  viewer = { module: m, index: idx };
  if (modStatus(m.id) === "not_started") setStatus(m.id, "in_progress");

  const screen = m.screens[idx];
  const isLast = idx === m.screens.length - 1;
  const steps = m.screens.map((_, i) => `<i class="${i <= idx ? "on" : ""}"></i>`).join("");
  main.innerHTML = `
    <div class="viewer">
      <div class="viewer-top">
        <a href="#/program">← 프로그램 목록</a>
        <span>${m.week}주차 · ${KIND_LABEL[m.kind]}</span>
        <span class="steps" aria-label="${idx + 1} / ${m.screens.length}">${steps}</span>
      </div>
      <article class="screen">
        <div class="eyebrow">${esc(m.title)}</div>
        <h1>${esc(screen.title)}</h1>
        <div class="tts no-print"><button class="btn link sm" id="tts-btn">🔈 읽어주기</button></div>
        <div class="body">${renderBody(screen.body)}</div>
        <div id="fields"></div>
        <div class="btn-row between no-print">
          ${idx > 0 ? `<a class="btn ghost" href="#/module/${m.id}/${idx - 1}">이전</a>` : `<span></span>`}
          <button class="btn accent" id="next-btn">${esc(screen.button || (isLast ? "완료" : "다음"))}</button>
        </div>
      </article>
    </div>`;

  $("#tts-btn").onclick = () => toggleTTS(`${screen.title}. ${screen.body || ""}`);
  const fields = $("#fields");
  if (screen.type === "worksheet") renderWorksheet(fields, m, screen);
  if (screen.type === "questionnaire") renderQuestionnaire(fields, m, screen);

  $("#next-btn").onclick = () => {
    if (screen.type === "worksheet" && !submitWorksheet(m, screen)) return;
    if (screen.type === "questionnaire") { submitQuestionnaire(m, screen); return; }
    if (screen.type === "worksheet" && screen.mode === "append") return; // 누적형은 화면에 머무름
    if (isLast) { setStatus(m.id, "completed"); toast("완료했습니다 ✓"); location.hash = "#/program"; }
    else location.hash = `#/module/${m.id}/${idx + 1}`;
  };
}

// --- 읽어주기 (브라우저 음성 합성) ---
let speaking = false;
function toggleTTS(text) {
  if (!("speechSynthesis" in window)) return toast("이 브라우저는 읽어주기를 지원하지 않습니다.");
  if (speaking) return stopTTS();
  const u = new SpeechSynthesisUtterance(text.replace(/[-—•]/g, " "));
  u.lang = "ko-KR"; u.rate = 0.95;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith("ko"));
  if (voice) u.voice = voice;
  u.onend = u.onerror = () => { speaking = false; const b = $("#tts-btn"); if (b) b.textContent = "🔈 읽어주기"; };
  speechSynthesis.cancel(); speechSynthesis.speak(u);
  speaking = true; $("#tts-btn").textContent = "■ 멈추기";
}
function stopTTS() { if ("speechSynthesis" in window && speaking) { speechSynthesis.cancel(); speaking = false; } }

// --- 워크시트 ---
function wsData(id) {
  if (!state.worksheets[id]) state.worksheets[id] = { single: {}, entries: [] };
  return state.worksheets[id];
}
function renderWorksheet(wrap, m, screen) {
  const append = screen.mode === "append";
  const data = wsData(m.id);
  wrap.innerHTML = screen.fields.map((f) => `
    <label class="field">
      <span class="label">${esc(f.label)}</span>
      <textarea data-key="${esc(f.key)}" placeholder="${esc(f.placeholder || "")}">${append ? "" : esc(data.single[f.key] || "")}</textarea>
    </label>`).join("") + (append ? `<div class="entries" id="entries"></div>` : "");
  if (append) renderEntries(m, screen);
}
function renderEntries(m, screen) {
  const wrap = $("#entries"); if (!wrap) return;
  const data = wsData(m.id);
  if (!data.entries.length) { wrap.innerHTML = ""; return; }
  const labels = Object.fromEntries(screen.fields.map((f) => [f.key, f.label]));
  wrap.innerHTML = `<h3>지금까지의 기록 <span class="muted">(${data.entries.length}건)</span></h3>` +
    data.entries.slice().reverse().map((en, i) => `
      <div class="entry">
        <div class="when">${data.entries.length - i}회차 · ${fmtDateTime(en.at)}</div>
        ${Object.entries(en.responses).map(([k, v]) => `<p><span class="q">${esc(labels[k] || k)}</span>${esc(v)}</p>`).join("")}
        <div class="tools no-print"><button class="btn link sm" data-del="${en.at}">삭제</button></div>
      </div>`).join("");
  wrap.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => {
    if (!confirm("이 기록을 삭제할까요?")) return;
    data.entries = data.entries.filter((e) => e.at !== b.dataset.del);
    save(); renderEntries(m, screen);
  });
}
function submitWorksheet(m, screen) {
  const responses = {};
  document.querySelectorAll("#fields textarea").forEach((ta) => { if (ta.value.trim()) responses[ta.dataset.key] = ta.value.trim(); });
  const data = wsData(m.id);
  if (screen.mode === "append") {
    if (!Object.keys(responses).length) { toast("한 칸 이상 적어 주세요."); return false; }
    data.entries.push({ at: new Date().toISOString(), responses });
    setStatus(m.id, "completed"); save();
    document.querySelectorAll("#fields textarea").forEach((ta) => (ta.value = ""));
    renderEntries(m, screen);
    toast("저장되었습니다 ✓ 아래에 기록이 쌓입니다.");
    return true;
  }
  data.single = responses; save();
  toast("저장되었습니다 ✓");
  return true;
}

// --- 설문 (THI) ---
function renderQuestionnaire(wrap, m, screen) {
  const q = P.questionnaires[screen.questionnaire_type];
  if (!q) { wrap.innerHTML = `<p class="muted">이 설문은 클리닉 방문 시 진행됩니다.</p>`; return; }
  const prev = state.questionnaires.find((r) => r.type === q.type && r.timepoint === screen.timepoint_label);
  wrap.innerHTML = `
    ${prev ? `<div class="notice ok">이미 ${fmtDateTime(prev.at)}에 제출한 설문입니다 (총점 ${prev.total}점). 다시 제출하면 새 결과로 바뀝니다. <a href="#/results">결과 보기</a></div>` : ""}
    <div class="card"><p class="muted" style="margin:0">${esc(q.instruction)}</p></div>
    ${q.items.map((it, i) => `
      <div class="q-item" data-key="${it.key}">
        <div class="q-text"><span class="q-num">${i + 1}</span>${esc(it.text)}</div>
        <div class="q-opts">${q.options.map((o) => `<label><input type="radio" name="${it.key}" value="${o.value}">${esc(o.label)}</label>`).join("")}</div>
      </div>`).join("")}`;
}
function thiSeverity(total) {
  const t = [[16, "slight"], [36, "mild"], [56, "moderate"], [76, "severe"], [100, "catastrophic"]];
  for (const [u, l] of t) if (total <= u) return l;
  return "catastrophic";
}
function submitQuestionnaire(m, screen) {
  const q = P.questionnaires[screen.questionnaire_type];
  if (!q) { setStatus(m.id, "completed"); location.hash = "#/program"; return; }
  const answers = {}; let firstMissing = null;
  document.querySelectorAll(".q-item").forEach((div) => div.classList.remove("missing"));
  for (const it of q.items) {
    const c = document.querySelector(`input[name="${it.key}"]:checked`);
    if (!c) { const div = document.querySelector(`.q-item[data-key="${it.key}"]`); div.classList.add("missing"); firstMissing ||= div; continue; }
    answers[it.key] = Number(c.value);
  }
  if (firstMissing) { toast("아직 답하지 않은 문항이 있습니다."); firstMissing.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  const total = Object.values(answers).reduce((a, b) => a + b, 0);
  state.questionnaires = state.questionnaires.filter((r) => !(r.type === q.type && r.timepoint === screen.timepoint_label));
  state.questionnaires.push({ type: q.type, timepoint: screen.timepoint_label, at: new Date().toISOString(), answers, total, severity: thiSeverity(total) });
  setStatus(m.id, "completed"); save();
  location.hash = "#/results";
}

function renderResults(main) {
  const q = P.questionnaires.THI;
  const rs = state.questionnaires.filter((r) => r.type === "THI").sort((a, b) => a.at.localeCompare(b.at));
  const tpLabel = { baseline: "시작 평가 (1주차)", week8: "종료 평가 (8주차)" };
  const box = (r) => `<div class="card"><div class="eyebrow">${tpLabel[r.timepoint] || r.timepoint}</div>
      <div class="stat">${r.total}<small>/ 100</small></div>
      <div><span class="pill">${esc(q.severity_labels[r.severity] || r.severity)}</span></div>
      <p class="muted small" style="margin-top:8px">${fmtDateTime(r.at)}</p></div>`;
  const base = rs.find((r) => r.timepoint === "baseline"), end = rs.find((r) => r.timepoint === "week8");
  let diff = "";
  if (base && end) {
    const d = base.total - end.total;
    diff = `<div class="notice ${d > 0 ? "ok" : ""}">시작 시점과 비교해 총점이 ${Math.abs(d)}점 ${d > 0 ? "낮아졌습니다" : d < 0 ? "높아졌습니다" : "같습니다"}. 결과는 다음 진료에서 담당 선생님과 함께 살펴봅니다.</div>`;
  }
  main.innerHTML = `
    <section class="hero" style="padding-bottom:20px"><div class="eyebrow">이명장애지수 (THI)</div><h1>평가 결과</h1>
      <p class="lead">총점이 낮을수록 이명이 일상에 미치는 영향이 적다는 뜻입니다. 점수는 진단이 아니라 변화를 보기 위한 기준점입니다.</p></section>
    ${diff}
    ${rs.length ? `<div class="result-compare">${rs.map(box).join("")}</div>` : `<div class="card"><p class="muted">아직 제출한 설문이 없습니다.</p></div>`}
    <div class="btn-row"><a class="btn ghost" href="#/program">프로그램 목록</a><a class="btn ghost" href="#/records">나의 기록</a></div>`;
}

// =====================================================================
//  오늘의 일기
// =====================================================================
function renderToday(main, [dateArg]) {
  const key = dateArg || dateKey();
  const d = state.diary[key] || {};
  const slider = (id, label, hint, val, lo, hi) => `
    <div class="slider">
      <div class="slider-head"><span class="label" style="font-weight:500">${label}</span><span class="val"><output id="out-${id}">${val}</output><small> / 10</small></span></div>
      <input type="range" id="in-${id}" min="0" max="10" value="${val}" aria-label="${label}">
      <div class="ends"><span>${lo}</span><span>${hi}</span></div>
      ${hint ? `<div class="muted small">${hint}</div>` : ""}
    </div>`;
  main.innerHTML = `
    <section class="hero" style="padding-bottom:16px">
      <div class="eyebrow">${key === dateKey() ? "오늘" : "지난 기록"} · ${fmtDate(key)}</div>
      <h1>${key === dateKey() ? "오늘의 기록" : "기록 수정"}</h1>
      <p class="lead">1분이면 충분합니다. 정확하지 않아도 괜찮으니 지금 느끼는 대로 남겨 주세요.</p>
    </section>
    <form class="card" id="diary-form">
      ${slider("tinnitus", "오늘 이명의 크기", "", d.tinnitus ?? 5, "거의 안 들림", "매우 큼")}
      ${slider("annoyance", "오늘 이명이 신경 쓰인 정도", "", d.annoyance ?? 5, "전혀", "매우")}
      ${slider("sleep", "어젯밤 수면에 미친 영향", "이명이 잠드는 것을 얼마나 방해했나요", d.sleep ?? 5, "전혀", "매우")}
      <hr class="divider">
      <label class="check"><input type="checkbox" id="in-mindfulness" ${d.mindfulness ? "checked" : ""}> 오늘 마음챙김 호흡을 했어요</label>
      <label class="check"><input type="checkbox" id="in-pmr" ${d.pmr ? "checked" : ""}> 오늘 근육이완(PMR)을 했어요</label>
      <hr class="divider">
      <label class="field"><span class="label">특이사항이나 트리거 <span class="muted">(선택)</span></span><input type="text" id="in-trigger" value="${esc(d.trigger || "")}" placeholder="예: 소음 노출, 피로, 카페인"></label>
      <label class="field"><span class="label">메모 <span class="muted">(선택)</span></span><span class="hint">사고기록, 이완 전후 긴장도, 수면일기 등을 자유롭게 적어 주세요.</span><textarea id="in-memo" placeholder="예: PMR 20분, 긴장도 7 → 3">${esc(d.memo || "")}</textarea></label>
      <div class="btn-row between"><a class="btn link" href="#/records">지난 기록 보기</a><button class="btn accent" type="submit">${d.at ? "수정 저장" : "저장"}</button></div>
    </form>`;
  ["tinnitus", "annoyance", "sleep"].forEach((id) => { $(`#in-${id}`).oninput = (e) => ($(`#out-${id}`).textContent = e.target.value); });
  $("#diary-form").onsubmit = (e) => {
    e.preventDefault();
    state.diary[key] = {
      tinnitus: Number($("#in-tinnitus").value), annoyance: Number($("#in-annoyance").value), sleep: Number($("#in-sleep").value),
      mindfulness: $("#in-mindfulness").checked, pmr: $("#in-pmr").checked,
      trigger: $("#in-trigger").value.trim(), memo: $("#in-memo").value.trim(), at: new Date().toISOString(),
    };
    save(); toast("저장되었습니다 ✓"); location.hash = "#/";
  };
}

// =====================================================================
//  사운드 (유튜브 재생 + 사용 기록)
// =====================================================================
let yt = { player: null, ready: false, current: null, session: null, tick: null };

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(); };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s);
    }
  });
}
function allSounds() { return window.SOUNDS.groups.flatMap((g) => g.items); }
function timeOfDayNow() { const h = new Date().getHours(); return h >= 6 && h < 22 ? "day" : "night"; }

function renderSound(main) {
  const S = window.SOUNDS;
  main.innerHTML = `
    <section class="hero" style="padding-bottom:16px">
      <div class="eyebrow">소리 치료</div>
      <h1>사운드</h1>
      <p class="lead">${esc(S.note)}</p>
    </section>
    <div class="card">
      <div class="player" id="player-wrap"><div class="empty" id="player-empty">아래에서 소리를 선택하세요</div><div id="yt-player"></div></div>
      <div class="kv"><span id="now-playing" class="muted">선택된 소리 없음</span><span class="timer" id="timer">00:00</span></div>
      <p class="muted small" style="margin:8px 0 0">재생을 누르면 사용 시간이 자동으로 기록되고, 밤 10시~아침 6시 사용은 야간으로 구분됩니다. 휴대폰 화면이 꺼지면 재생이 멈출 수 있으니 취침 시에는 화면 자동 잠금을 길게 설정해 두세요.</p>
    </div>
    ${S.groups.map((g) => `
      <section class="section">
        <div class="section-head"><h2>${esc(g.title)}</h2></div>
        <p class="muted">${esc(g.desc)}</p>
        <div class="sound-list">${g.items.map((it) => `
          <button class="sound-item ${it.youtubeId ? "" : "na"}" data-id="${it.id}" ${it.youtubeId ? "" : "disabled"}>
            <span class="st">${esc(it.title)}</span>
            <span class="sd">${it.youtubeId ? esc(it.desc) : "준비 중"}</span>
          </button>`).join("")}</div>
      </section>`).join("")}
    <section class="section">
      <div class="section-head"><h2>최근 사용 기록</h2><a class="more" href="#/records">전체 보기</a></div>
      <div class="card">${renderSoundLog(7)}</div>
    </section>`;
  document.querySelectorAll(".sound-item:not(.na)").forEach((b) => b.onclick = () => playSound(b.dataset.id));
  if (yt.current) markPlaying(yt.current.id);
  updateTimer();
}

async function playSound(id) {
  const item = allSounds().find((s) => s.id === id);
  if (!item || !item.youtubeId) return;
  endSession();
  yt.current = item;
  markPlaying(id);
  $("#player-empty").hidden = true;
  $("#now-playing").textContent = item.title;
  await loadYouTubeAPI();
  if (yt.player && $("#yt-player") === null) { yt.player = null; } // 화면 이동으로 DOM이 사라진 경우
  if (yt.player && typeof yt.player.loadVideoById === "function" && document.body.contains(yt.player.getIframe())) {
    yt.player.loadVideoById(item.youtubeId);
    return;
  }
  yt.player = new YT.Player("yt-player", {
    host: "https://www.youtube-nocookie.com",
    videoId: item.youtubeId,
    playerVars: { autoplay: 1, loop: 1, playlist: item.youtubeId, rel: 0, modestbranding: 1, playsinline: 1 },
    events: { onStateChange: onPlayerState },
  });
}
function markPlaying(id) {
  document.querySelectorAll(".sound-item").forEach((b) => b.classList.toggle("on", b.dataset.id === id));
}
function onPlayerState(e) {
  const S = YT.PlayerState;
  if (e.data === S.PLAYING) startSession();
  else if (e.data === S.PAUSED || e.data === S.ENDED) endSession();
}
function startSession() {
  if (yt.session || !yt.current) return;
  yt.session = { soundId: yt.current.id, title: yt.current.title, startedAt: new Date().toISOString() };
  clearInterval(yt.tick); yt.tick = setInterval(updateTimer, 1000);
}
function endSession() {
  clearInterval(yt.tick);
  if (!yt.session) return;
  const s = yt.session; yt.session = null;
  const ended = new Date();
  const dur = Math.round((ended - new Date(s.startedAt)) / 1000);
  if (dur >= 10) {
    state.soundSessions.push({ ...s, endedAt: ended.toISOString(), durationSec: dur, timeOfDay: timeOfDayNow() });
    save();
    if (location.hash.startsWith("#/sound")) { const cards = document.querySelectorAll(".section .card"); if (cards.length) cards[cards.length - 1].innerHTML = renderSoundLog(7); }
  }
  updateTimer();
}
function updateTimer() {
  const el = $("#timer"); if (!el) return;
  if (!yt.session) { el.textContent = "00:00"; return; }
  const sec = Math.floor((Date.now() - new Date(yt.session.startedAt)) / 1000);
  el.textContent = `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
}
window.addEventListener("beforeunload", endSession);

function renderSoundLog(days) {
  const since = Date.now() - days * 86400000;
  const list = state.soundSessions.filter((s) => new Date(s.startedAt) >= since).slice().reverse();
  if (!list.length) return `<p class="muted" style="margin:0">최근 ${days}일 사용 기록이 없습니다.</p>`;
  const total = list.reduce((a, s) => a + s.durationSec, 0);
  return `<div class="kv" style="margin-bottom:10px"><span>최근 ${days}일 합계</span><b>${fmtDur(total)}</b></div>
    <ul class="list-plain">${list.slice(0, 8).map((s) => `<li class="kv"><span>${fmtDateTime(s.startedAt)} · ${esc(s.title)} <span class="pill">${s.timeOfDay === "night" ? "야간" : "주간"}</span></span><span>${fmtDur(s.durationSec)}</span></li>`).join("")}</ul>`;
}
function fmtDur(sec) {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return h ? `${h}시간 ${m}분` : `${m}분`;
}

// =====================================================================
//  나의 기록
// =====================================================================
function renderRecords(main) {
  const days = Object.keys(state.diary).sort();
  const wsList = P.modules.filter((m) => m.kind === "write" || m.id === "week8_act");
  main.innerHTML = `
    <section class="hero" style="padding-bottom:16px">
      <div class="eyebrow">나의 기록</div>
      <h1>기록</h1>
      <p class="lead">일기, 워크시트, 설문, 소리 치료 사용 기록을 한곳에서 봅니다. 진료 때 함께 보려면 인쇄하거나 파일로 내보내세요.</p>
      <div class="btn-row no-print"><button class="btn ghost sm" id="print-btn">인쇄 / PDF 저장</button><a class="btn ghost sm" href="#/settings">파일로 내보내기</a></div>
    </section>

    <section class="section">
      <div class="section-head"><h2>일기 추이</h2><a class="more" href="#/today">오늘 기록</a></div>
      <div class="card">${days.length >= 2 ? renderChart(days) : `<p class="muted" style="margin:0">일기를 이틀 이상 기록하면 추이가 표시됩니다.</p>`}</div>
      <div class="card">
        ${days.length ? `<div class="table-wrap"><table><thead><tr><th>날짜</th><th>크기</th><th>괴로움</th><th>수면</th><th>실습</th><th>메모</th></tr></thead><tbody>
          ${days.slice().reverse().map((k) => { const d = state.diary[k]; return `<tr><td><a href="#/today/${k}">${k.slice(5).replace("-", "/")}</a></td><td class="num">${d.tinnitus}</td><td class="num">${d.annoyance}</td><td class="num">${d.sleep}</td><td>${[d.mindfulness ? "마음챙김" : "", d.pmr ? "PMR" : ""].filter(Boolean).join(", ")}</td><td class="small">${esc([d.trigger, d.memo].filter(Boolean).join(" · "))}</td></tr>`; }).join("")}
        </tbody></table></div>` : `<p class="muted" style="margin:0">아직 일기가 없습니다.</p>`}
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>워크시트</h2></div>
      ${wsList.map((m) => {
        const d = state.worksheets[m.id]; if (!d) return "";
        const fields = m.screens.filter((s) => s.type === "worksheet").flatMap((s) => s.fields);
        const labels = Object.fromEntries(fields.map((f) => [f.key, f.label]));
        const single = Object.keys(d.single || {}).length ? `<div class="entry">${Object.entries(d.single).map(([k, v]) => `<p><span class="q">${esc(labels[k] || k)}</span>${esc(v)}</p>`).join("")}</div>` : "";
        const entries = (d.entries || []).slice().reverse().map((en) => `<div class="entry"><div class="when">${fmtDateTime(en.at)}</div>${Object.entries(en.responses).map(([k, v]) => `<p><span class="q">${esc(labels[k] || k)}</span>${esc(v)}</p>`).join("")}</div>`).join("");
        if (!single && !entries) return "";
        return `<div class="card"><div class="section-head"><h3>${esc(m.title)}</h3><a class="more" href="#/module/${m.id}/${m.screens.findIndex((s) => s.type === "worksheet")}">열기</a></div>${single}${entries}</div>`;
      }).join("") || `<div class="card"><p class="muted" style="margin:0">아직 작성한 워크시트가 없습니다.</p></div>`}
    </section>

    <section class="section">
      <div class="section-head"><h2>평가 설문 (THI)</h2><a class="more" href="#/results">결과 비교</a></div>
      <div class="card">${state.questionnaires.length ? `<ul class="list-plain">${state.questionnaires.map((r) => `<li class="kv"><span>${r.timepoint === "baseline" ? "시작 평가" : "종료 평가"} · ${fmtDateTime(r.at)}</span><b>${r.total}점 <span class="pill">${esc(P.questionnaires.THI.severity_labels[r.severity])}</span></b></li>`).join("")}</ul>` : `<p class="muted" style="margin:0">아직 제출한 설문이 없습니다.</p>`}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>소리 치료 사용</h2><a class="more" href="#/sound">사운드</a></div>
      <div class="card">${renderSoundLog(30)}</div>
    </section>`;
  $("#print-btn").onclick = () => window.print();
}

// 일기 추이 — 3개 시리즈 선 그래프 (SVG). 색은 dataviz 검증을 통과한 3색.
const SERIES = [
  { key: "tinnitus", label: "이명 크기", color: "#C2542F" },
  { key: "annoyance", label: "신경 쓰인 정도", color: "#2F6FB3" },
  { key: "sleep", label: "수면 영향", color: "#6B7F2E" },
];
function renderChart(days) {
  const last = days.slice(-42); // 최근 6주
  const W = 720, H = 240, L = 34, R = 16, T = 16, B = 34;
  const iw = W - L - R, ih = H - T - B;
  const x = (i) => L + (last.length === 1 ? iw / 2 : (i / (last.length - 1)) * iw);
  const y = (v) => T + ih - (v / 10) * ih;
  const grid = [0, 5, 10].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#DBD7CB" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#7C7A73">${v}</text>`).join("");
  const step = Math.max(1, Math.ceil(last.length / 6));
  const xlabels = last.map((k, i) => (i % step === 0 || i === last.length - 1) ? `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#7C7A73">${k.slice(5).replace("-", "/")}</text>` : "").join("");
  const lines = SERIES.map((s) => {
    const pts = last.map((k, i) => `${x(i).toFixed(1)},${y(state.diary[k][s.key]).toFixed(1)}`).join(" ");
    const dots = last.map((k, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(state.diary[k][s.key]).toFixed(1)}" r="3.5" fill="${s.color}" stroke="#FCFBF8" stroke-width="2"><title>${k} ${s.label} ${state.diary[k][s.key]}</title></circle>`).join("");
    return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
  }).join("");
  return `<div class="chart-wrap"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="최근 일기 추이 그래프">${grid}${xlabels}${lines}</svg></div>
    <div class="legend">${SERIES.map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join("")}</div>`;
}

// =====================================================================
//  설정 / 내보내기 / 가져오기
// =====================================================================
function renderSettings(main) {
  const p = state.profile;
  main.innerHTML = `
    <section class="hero" style="padding-bottom:16px"><div class="eyebrow">설정</div><h1>설정과 데이터</h1>
      <p class="lead">모든 기록은 이 기기의 브라우저에만 저장됩니다. 기기를 바꾸거나 브라우저 데이터를 지우면 사라지므로, 진료 전이나 정기적으로 파일로 내보내 두세요.</p></section>
    <div class="card">
      <h3>프로그램</h3>
      <label class="field"><span class="label">시작일</span><input type="date" id="s-start" value="${p.startDate || ""}"></label>
      <label class="field"><span class="label">이름 또는 별칭</span><input type="text" id="s-name" value="${esc(p.nickname)}" maxlength="20"></label>
      <label class="check"><input type="checkbox" id="s-unlock" ${p.unlockAll ? "checked" : ""}> 모든 주차 열기 <span class="muted small">(클리닉 안내에 따라 필요할 때만)</span></label>
      <div class="btn-row"><button class="btn" id="s-save">저장</button></div>
    </div>
    <div class="card">
      <h3>데이터 내보내기 · 가져오기</h3>
      <p class="muted">내보낸 파일(JSON)에는 일기, 워크시트, 설문, 소리 사용 기록이 모두 담깁니다. 담당 선생님께 전달하거나 새 기기에서 가져올 수 있습니다.</p>
      <div class="btn-row"><button class="btn" id="s-export">파일로 내보내기</button><button class="btn ghost" id="s-import">파일 가져오기</button><input type="file" id="s-file" accept="application/json,.json" hidden></div>
    </div>
    <div class="card">
      <h3>초기화</h3>
      <p class="muted">이 기기의 모든 기록을 지웁니다. 되돌릴 수 없으니 먼저 내보내기를 해 두세요.</p>
      <div class="btn-row"><button class="btn ghost" id="s-reset" style="color:var(--accent-ink)">모든 기록 지우기</button></div>
    </div>`;
  $("#s-save").onclick = () => {
    p.startDate = $("#s-start").value || p.startDate; p.nickname = $("#s-name").value.trim(); p.unlockAll = $("#s-unlock").checked;
    save(); toast("저장되었습니다 ✓");
  };
  $("#s-export").onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `이명기록_${p.nickname || "기록"}_${dateKey()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $("#s-import").onclick = () => $("#s-file").click();
  $("#s-file").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || typeof data !== "object" || !data.profile) throw new Error();
      if (!confirm("현재 기기의 기록을 이 파일의 내용으로 바꿀까요?")) return;
      state = Object.assign(DEFAULT_STATE(), data); save(); toast("가져왔습니다 ✓"); location.hash = "#/";
    } catch (err) { toast("파일을 읽을 수 없습니다."); }
  };
  $("#s-reset").onclick = () => {
    if (!confirm("정말 모든 기록을 지울까요? 되돌릴 수 없습니다.")) return;
    if (!confirm("마지막 확인입니다. 지우시겠습니까?")) return;
    state = DEFAULT_STATE(); save(); location.hash = "#/"; toast("모든 기록을 지웠습니다.");
  };
}
