/* 이명 관리 프로그램 — 정적 웹앱 (백엔드 없음, 기록은 이 기기의 localStorage에 저장) */
"use strict";

// =====================================================================
//  저장소
// =====================================================================
const STORE_KEY = "tinnitus_cbt_v1";
const newId = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const DEFAULT_STATE = () => ({
  version: 1,
  profile: { id: newId(), startDate: null, nickname: "", unlockAll: false, fontScale: 1 },
  progress: {},        // moduleId -> "in_progress" | "completed"
  resume: {},          // moduleId -> 마지막으로 보던 화면 번호
  drafts: {},          // moduleId -> {key: 작성 중인 글} (저장 전 임시 보관)
  worksheets: {},      // moduleId -> { single: {key: text}, entries: [{at, responses}] }
  questionnaires: [],  // {type, timepoint, at, answers, total, severity}
  diary: {},           // "YYYY-MM-DD" -> {tinnitus, annoyance, sleep, mindfulness, pmr, trigger, memo, at}
  soundSessions: [],   // {soundId, title, startedAt, endedAt, durationSec, timeOfDay}
});

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const base = DEFAULT_STATE();
    if (!raw) return base;
    const s = JSON.parse(raw);
    const merged = Object.assign(base, s, { profile: Object.assign(base.profile, s.profile || {}) });
    if (!merged.profile.id) merged.profile.id = newId();
    return merged;
  } catch (e) { return DEFAULT_STATE(); }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast("저장하지 못했습니다. 기기의 저장 공간이 부족할 수 있으니 진료실에 알려 주세요."); }
}

// =====================================================================
//  유틸
// =====================================================================
const P = window.PROGRAM;
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shiftDate = (key, days) => { const d = new Date(key + "T00:00:00"); d.setDate(d.getDate() + days); return dateKey(d); };
const fmtDate = (key) => { const [y, m, d] = key.split("-"); return `${y}년 ${Number(m)}월 ${Number(d)}일`; };
const fmtDateTime = (iso) => { const d = new Date(iso); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const weekdayKo = ["일", "월", "화", "수", "목", "금", "토"];
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let toastTimer = null;
function toast(msg, ms = 4000) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}
function applyFontScale() {
  document.documentElement.style.fontSize = `${Math.round(100 * (state.profile.fontScale || 1))}%`;
}

// 원고 본문(줄바꿈 텍스트) → HTML. 빈 줄로 문단 구분. "- " 는 목록, "1. " 는 번호 목록.
// 한 블록 안에 제목줄과 목록이 섞여 있어도 (예: "리듬:\n- ...") 제목 + 목록으로 그린다.
function renderBody(text) {
  if (!text) return "";
  const isUl = (l) => /^- /.test(l), isOl = (l) => /^\d+\. /.test(l);
  return text.split(/\n\s*\n/).map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return "";
    if (lines.length === 1 && /^["“].+["”]$/.test(lines[0])) return `<blockquote>${esc(lines[0])}</blockquote>`;
    const hasList = lines.some((l) => isUl(l) || isOl(l));
    const allOl = lines.every(isOl), allUl = lines.every(isUl);
    if (!hasList) return `<p>${lines.map(esc).join("<br>")}</p>`;
    if (allUl) return `<ul>${lines.map((l) => `<li>${esc(l.slice(2))}</li>`).join("")}</ul>`;
    if (allOl) return `<ol>${lines.map((l) => `<li>${esc(l.replace(/^\d+\. /, ""))}</li>`).join("")}</ol>`;
    // 섞인 블록: 목록이 아닌 줄은 소제목(strong.lead), 이어지는 목록은 묶어서
    let out = "", buf = [], bufType = null;
    const flush = () => { if (!buf.length) return; out += bufType === "ol" ? `<ol>${buf.map((l) => `<li>${esc(l.replace(/^\d+\. /, ""))}</li>`).join("")}</ol>` : `<ul>${buf.map((l) => `<li>${esc(l.slice(2))}</li>`).join("")}</ul>`; buf = []; bufType = null; };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const ty = isUl(l) ? "ul" : isOl(l) ? "ol" : null;
      // 번호줄 뒤에 "- " 항목이 오면 번호줄은 소제목으로 취급
      if (ty === "ol" && lines[i + 1] && isUl(lines[i + 1])) { flush(); out += `<strong class="lead">${esc(l)}</strong>`; continue; }
      if (!ty) { flush(); out += `<strong class="lead">${esc(l)}</strong>`; continue; }
      if (bufType && bufType !== ty) flush();
      bufType = ty; buf.push(l);
    }
    flush();
    return out;
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
function completedCount() { return P.modules.filter((m) => modStatus(m.id) === "completed").length; }

const KIND_LABEL = { learn: "읽기", write: "적기", homework: "숙제", assess: "설문", summary: "정리" };

// =====================================================================
//  라우터 + 화면 전환 효과
// =====================================================================
const routes = {
  "": renderHome, home: renderHome, program: renderProgram, module: renderModule,
  today: renderToday, sound: renderSound, records: renderRecords, settings: renderSettings, results: renderResults, share: renderShare,
};
let cleanup = null; // 화면을 떠날 때 타이머 등을 정리
function paint() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [name, ...rest] = hash.split("/");
  const fn = routes[name] || renderHome;
  const main = $("#main");
  stopTTS();
  destroyPlayer();
  if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
  main.innerHTML = "";
  fn(main, rest);
  main.focus({ preventScroll: true });
  document.querySelectorAll(".nav a").forEach((a) => {
    const r = a.dataset.route;
    a.classList.toggle("active", r === (name || "home") || (name === "module" && r === "program") || (["results", "share"].includes(name) && r === "records"));
  });
  window.scrollTo({ top: 0 });
}
function route() {
  if (document.startViewTransition && !reduceMotion()) {
    const t = document.startViewTransition(paint);
    for (const k of ["ready", "finished", "updateCallbackDone"]) if (t[k]) t[k].catch(() => {}); // 탭이 숨겨졌거나 연속 이동 시 전환이 중단되는 것은 정상
  } else { paint(); const m = $("#main"); m.classList.remove("enter"); void m.offsetWidth; m.classList.add("enter"); }
}
window.addEventListener("hashchange", route);
window.addEventListener("load", () => {
  applyFontScale(); paint();
  $("#font-btn").onclick = () => {
    const steps = [1, 1.15, 1.3], cur = steps.indexOf(Number(state.profile.fontScale || 1));
    state.profile.fontScale = steps[(cur + 1) % steps.length]; save(); applyFontScale();
    toast(`글자 크기: ${["보통", "크게", "아주 크게"][(cur + 1) % steps.length]}`);
  };
});

// =====================================================================
//  홈
// =====================================================================
function renderHome(main) {
  const started = !!state.profile.startDate;
  const w = currentWeek();
  const today = state.diary[dateKey()]?.at ? state.diary[dateKey()] : null;
  const name = state.profile.nickname ? `${esc(state.profile.nickname)}님, ` : "";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "좋은 아침입니다" : hour < 18 ? "안녕하세요" : "편안한 저녁입니다";

  if (!started) {
    main.innerHTML = `
      <section class="hero with-art">
        <div>
          <div class="eyebrow">이명 인지행동치료</div>
          <h1>이명과 함께,<br>원하는 삶으로.</h1>
          <p class="lead">${esc(P.name)}은 이명 소리에 대한 반응을 바꾸어 이명과 편안하게 지내는 방법을 익히는 과정입니다. 하루 10~15분이면 충분합니다.</p>
        </div>
        ${ART.heroRings()}
      </section>
      <div class="card tint" style="margin-bottom:24px">
        <h3>프로그램 시작</h3>
        <p class="muted">시작일을 기준으로 매주 다음 내용이 열립니다. 클리닉에서 안내받은 날짜가 있다면 그 날짜로 맞춰 주세요.</p>
        <label class="field"><span class="label">시작일</span><input type="date" id="start-date" value="${dateKey()}"></label>
        <label class="field"><span class="label">이름 또는 별칭 <span class="muted">(진료 때 기록을 전달할 때 표시됩니다)</span></span><input type="text" id="nickname" placeholder="예: 홍길동" maxlength="20"></label>
        <button class="btn accent big" id="start-btn">시작하기</button>
        <p class="muted small" style="margin:12px 0 0">휴대폰에서는 브라우저 메뉴의 '홈 화면에 추가'를 눌러 두면 앱처럼 열 수 있고 기록도 더 안전하게 보관됩니다. 진료실에서 도와드립니다.</p>
      </div>
      <div class="grid">
        <div class="card"><div class="eyebrow">매주</div><h3>짧은 읽기와 적기</h3><p class="muted">매주 새로운 내용이 열리고, 워크시트에 내 이야기를 직접 적어봅니다.</p></div>
        <div class="card"><div class="eyebrow">매일</div><h3>1분 일기</h3><p class="muted">이명의 크기와 신경 쓰인 정도를 기록해 나만의 패턴을 찾습니다.</p></div>
        <div class="card"><div class="eyebrow">언제든</div><h3>소리 치료</h3><p class="muted">클리닉에서 안내받은 소리를 재생하면 사용 시간이 기록됩니다.</p></div>
      </div>
      `;
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
  const next = P.modules.find((m) => isWeekOpen(m.week) && modStatus(m.id) !== "completed");
  const behind = next && next.week < w;
  const weekInfo = P.weeks[w - 1];
  const done = completedCount();
  const pct = Math.round((done / P.modules.length) * 100);
  const allDone = done === P.modules.length;
  const crisis = state.worksheets["week8_worksheet"]?.single;
  const resumeIdx = next ? state.resume[next.id] : 0;
  const resumable = next && (resumeIdx || state.drafts[next.id]);

  main.innerHTML = `
    <section class="hero with-art">
      <div>
        <div class="eyebrow">${weekdayKo[new Date().getDay()]}요일 · ${fmtDate(dateKey())}</div>
        <h1>${name}${greet}.</h1>
        <p class="lead">${allDone ? "8주 과정을 모두 마쳤습니다. 도구상자는 언제든 다시 열어볼 수 있습니다." : `지금은 <b>${w}주차</b>, ${esc(weekInfo.title)} 주간입니다.`}</p>
      </div>
      ${ART.week(w, "hero-art")}
    </section>

    <div class="grid">
      <a class="card" href="#/${next ? "module/" + next.id + (resumeIdx ? "/" + resumeIdx : "") : "program"}">
        <div class="eyebrow">${behind ? `${next.week}주차에 남은 것` : "이번 주 프로그램"}</div>
        <h3>${next ? esc(next.title) : "이번 주 내용을 모두 마쳤습니다"}</h3>
        <p class="muted small">${next ? KIND_LABEL[next.kind] + (resumable ? " · 하던 곳부터 이어서" : " · 시작하기") : "프로그램 목록에서 지난 내용을 다시 볼 수 있습니다"}</p>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <div class="small muted">전체 ${done} / ${P.modules.length} 완료</div>
      </a>
      <a class="card ${today ? "" : "accent"}" href="#/today">
        <div class="eyebrow">오늘의 일기</div>
        <h3>${today ? "오늘 기록을 마쳤습니다" : "아직 기록하지 않았습니다"}</h3>
        ${today ? `<p class="muted small">이명 크기 ${today.tinnitus} · 신경 쓰임 ${today.annoyance} · 수면 영향 ${today.sleep}<br>눌러서 수정할 수 있습니다</p>` : `<p class="muted small">1분이면 충분합니다. 이명 크기와 신경 쓰인 정도를 남겨 주세요.</p>`}
      </a>
      <a class="card" href="#/sound">
        <div class="eyebrow">소리 치료</div>
        <h3>사운드 재생</h3>
        <p class="muted small">${soundSummaryLine()}</p>
      </a>
      <a class="card" href="#/share">
        <div class="eyebrow">진료 때</div>
        <h3>기록 전달 (QR)</h3>
        <p class="muted small">진료실에서 이 화면을 열어 선생님께 보여 주세요.</p>
      </a>
    </div>

    ${crisis && Object.keys(crisis).length ? `
    <section class="section">
      <div class="section-head"><h2>나의 위기 대응 카드</h2><a class="more" href="#/module/week8_worksheet/0/back">수정하기</a></div>
      <div class="card tint">${renderCrisisCard(crisis)}</div>
    </section>` : ""}

    <section class="section">
      <div class="section-head"><h2>${w}주차 · ${esc(weekInfo.title)}</h2><a class="more" href="#/program">전체 프로그램</a></div>
      <div class="card">${renderModuleList(mods)}</div>
    </section>`;
}

function renderCrisisCard(c) {
  const labels = { warning_signs: "나의 경고 신호", first_action: "첫 번째 행동", helpful_thoughts: "효과 있었던 생각", backup_plan: "그래도 힘들면" };
  return Object.entries(labels).filter(([k]) => c[k]).map(([k, l]) => `<p style="white-space:pre-wrap"><span class="eyebrow" style="display:block;margin:0">${l}</span>${esc(c[k])}</p>`).join("");
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
    const stText = st === "completed" ? "완료" : st === "in_progress" ? "진행 중" : "";
    return `<a class="mod ${cls} ${m.kind === "write" ? "write" : ""}" href="#/module/${m.id}">
      <span class="dot" aria-hidden="true">${mark}</span>
      <span class="t">${esc(m.title)}<span class="kind">${KIND_LABEL[m.kind]}${stText ? " · " + stText : ""}</span></span>
      <span class="chev" aria-hidden="true">›</span></a>`;
  }).join("");
}

// =====================================================================
//  프로그램 목록
// =====================================================================
function renderProgram(main) {
  if (!state.profile.startDate) { toast("먼저 홈에서 '시작하기'를 눌러 주세요."); location.replace("#/"); return; }
  const cw = currentWeek();
  main.innerHTML = `
    <section class="hero" style="padding-bottom:20px">
      <div class="eyebrow">8주 프로그램</div>
      <h1>프로그램 목록</h1>
      <p class="lead">시작일 ${fmtDate(state.profile.startDate)} 기준, 지금은 ${cw}주차입니다. ${state.profile.unlockAll ? "모든 주차가 열려 있습니다." : "다음 주차는 7일마다 자동으로 열립니다."}</p>
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
        ${ART.week(wk.week, "week-art")}
        <span class="week-title"><span class="week-num">${wk.week}주차</span><h3>${esc(wk.title)}</h3><span class="sub">${esc(wk.subtitle)}</span></span>
        <span class="week-status">${open ? (doneN === mods.length ? "완료 ✓" : `${doneN}/${mods.length}`) : `🔒 잠김<span class="week-open">${fmtDate(shiftDate(state.profile.startDate, (wk.week - 1) * 7)).slice(6)}에 열림</span>`}</span>
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

// 특정 화면에 붙는 그림·실습 도구
const EXTRAS = {
  "week1_psychoeducation:1": "cycle",
  "week3_training:0": "breath",
  "week5_training:1": "pmr",
  "week6_psychoeducation:1": "breath-cue",
};

function nextModuleAfter(m) {
  return P.modules.find((x) => x.week === m.week && x.order > m.order && modStatus(x.id) !== "completed") || null;
}
function finishModule(m, label) {
  setStatus(m.id, "completed"); delete state.resume[m.id]; save();
  const nx = nextModuleAfter(m);
  if (/홈/.test(label || "")) { toast("완료했습니다 ✓"); location.hash = "#/"; return; }
  if (nx) { toast(`완료했습니다 ✓ 이어서: ${nx.title}`, 3500); location.hash = `#/module/${nx.id}`; return; }
  toast("이번 주 내용을 모두 마쳤습니다 ✓"); location.hash = "#/program";
}
function renderModule(main, [id, idxStr, flag]) {
  const m = moduleById(id);
  if (!m) { location.replace("#/program"); return; }
  if (!isWeekOpen(m.week)) { toast("아직 열리지 않은 주차입니다."); location.replace("#/program"); return; }
  const idx = Math.min(Math.max(Number(idxStr) || 0, 0), m.screens.length - 1);
  viewer = { module: m, index: idx };
  if (modStatus(m.id) === "not_started") setStatus(m.id, "in_progress");
  state.resume[m.id] = idx; save();

  const screen = m.screens[idx];
  const isLast = idx === m.screens.length - 1;
  const steps = m.screens.map((_, i) => `<i class="${i <= idx ? "on" : ""}"></i>`).join("");
  const showArt = idx === 0 && m.kind !== "write" && screen.type === "text";
  const extra = EXTRAS[`${m.id}:${idx}`];
  const backMode = flag === "back" || flag === "entries";
  const already = modStatus(m.id) === "completed";
  const singleEdit = screen.type === "worksheet" && screen.mode !== "append" && already; // 이미 마친 워크시트를 고치는 중
  const nextLabel = singleEdit ? "저장" : (screen.button || (isLast ? "완료" : "다음"));
  main.innerHTML = `
    <div class="viewer">
      <div class="viewer-top">
        ${backMode ? `<a href="#" class="back" id="back-top">‹ 돌아가기</a>` : `<a href="#/program" class="back">‹ 목록</a>`}
        <span>${m.week}주차 · ${KIND_LABEL[m.kind]} · ${idx + 1}/${m.screens.length}</span>
        <span class="steps" aria-hidden="true">${steps}</span>
      </div>
      <article class="screen">
        ${showArt ? ART.week(m.week, "screen-art") : ""}
        ${screen.title.replace(/\s/g, "") === m.title.replace(/\s/g, "") ? "" : `<div class="eyebrow">${esc(m.title)}</div>`}
        <h1>${esc(screen.title)}</h1>
        <div class="tts no-print"><button class="btn ghost sm" id="tts-btn" type="button">🔈 소리로 듣기</button></div>
        <div class="body">${renderBody(screen.body)}</div>
        <div id="extra"></div>
        <div id="fields"></div>
        <div class="btn-row between no-print sticky-actions">
          ${backMode ? `<button class="btn ghost" id="back-btn" type="button">‹ 돌아가기</button>` : idx > 0 ? `<a class="btn ghost" href="#/module/${m.id}/${idx - 1}">‹ 이전</a>` : `<a class="btn ghost" href="#/program">목록</a>`}
          <button class="btn accent big" id="next-btn" type="button">${esc(nextLabel)}${isLast || screen.type !== "text" ? "" : " ›"}</button>
        </div>
      </article>
    </div>`;

  $("#tts-btn").onclick = () => toggleTTS(`${screen.title}. ${screen.body || ""}`);
  if (extra) mountExtra(extra, $("#extra"), screen);
  const fields = $("#fields");
  if (screen.type === "worksheet") renderWorksheet(fields, m, screen);
  if (screen.type === "questionnaire") renderQuestionnaire(fields, m, screen);

  $("#next-btn").onclick = () => {
    if (screen.type === "worksheet") {
      if (!submitWorksheet(m, screen)) return;
      if (screen.mode === "append") return;
      if (singleEdit) { if (backMode && history.length > 1) history.back(); return; } // 고친 내용만 저장하고 머무름
    }
    if (screen.type === "questionnaire") { submitQuestionnaire(m, screen); return; }
    if (isLast) finishModule(m, nextLabel);
    else location.hash = `#/module/${m.id}/${idx + 1}`;
  };
  if (flag === "entries") setTimeout(() => $("#entries")?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" }), 50);
  const goBack = (e) => { e.preventDefault(); if (history.length > 1) history.back(); else location.hash = "#/program"; };
  if ($("#back-btn")) $("#back-btn").onclick = goBack;
  if ($("#back-top")) $("#back-top").onclick = goBack;
}

function mountExtra(kind, el, screen) {
  if (kind === "cycle") {
    const steps = (screen.body.match(/^\d+\. .+$/gm) || []).map((l) => l.replace(/^\d+\. /, ""));
    el.innerHTML = `<h3 class="extra-title">악순환 고리 한눈에 보기</h3>` + ART.cycle(steps);
  } else if (kind === "breath" || kind === "breath-cue") {
    const cue = kind === "breath-cue" ? (state.worksheets.week6_worksheet?.single?.cue_word || "") : "";
    el.innerHTML = `<h3 class="extra-title">${kind === "breath-cue" ? "호흡–단서어 연습" : "지금 바로 연습하기"}</h3><p class="muted">${kind === "breath-cue" ? (cue ? `내쉴 때 단서어 <b>'${esc(cue)}'</b>가 표시됩니다.` : "다음 워크시트에서 단서어를 정하면 내쉴 때 그 단어가 표시됩니다.") : "원이 커질 때 들이쉬고, 작아질 때 내쉽니다. 이명이 들려도 그대로 두고 호흡으로 돌아오면 됩니다."}</p><div id="breath"></div>`;
    cleanup = ART.mountBreath($("#breath"), { cue, onDone: () => markPractice("mindfulness", el) });
  } else if (kind === "pmr") {
    const parts = ART.parsePMRParts(screen.body);
    el.innerHTML = `<h3 class="extra-title">안내에 따라 해보기</h3><p class="muted">시작을 누르면 부위마다 긴장·이완 시간을 세어 줍니다. 순서는 위 목록과 같습니다.</p><div id="pmr"></div>`;
    cleanup = ART.mountPMR($("#pmr"), parts, { onDone: () => markPractice("pmr", el) });
  }
}
// 실습을 마치면 오늘 일기에 자동 체크
function markPractice(key, el) {
  const k = dateKey();
  const d = state.diary[k] || { tinnitus: null, annoyance: null, sleep: null, mindfulness: false, pmr: false, trigger: "", memo: "", at: null };
  d[key] = true; if (!d.at) d.partial = true;
  state.diary[k] = d; save();
  toast(`오늘 일기에 '${key === "pmr" ? "근육이완" : "마음챙김"}' 체크가 표시되었습니다 ✓`);
  if (el && !$("#go-diary", el)) { const b = document.createElement("div"); b.className = "btn-row center"; b.innerHTML = `<a class="btn" id="go-diary" href="#/today">오늘 일기 쓰러 가기 ›</a>`; el.appendChild(b); }
}

// --- 소리로 듣기 (브라우저 음성 합성) ---
let speaking = false;
function toggleTTS(text) {
  if (!("speechSynthesis" in window)) return toast("이 브라우저는 소리로 듣기를 지원하지 않습니다.");
  if (speaking) return stopTTS();
  const u = new SpeechSynthesisUtterance(text.replace(/[-—•]/g, " "));
  u.lang = "ko-KR"; u.rate = 0.92;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").startsWith("ko"));
  if (voice) u.voice = voice;
  u.onend = u.onerror = () => { speaking = false; const b = $("#tts-btn"); if (b) b.textContent = "🔈 소리로 듣기"; };
  speechSynthesis.cancel(); speechSynthesis.speak(u);
  speaking = true; $("#tts-btn").textContent = "■ 멈추기";
}
function stopTTS() { if ("speechSynthesis" in window && speaking) { speechSynthesis.cancel(); speaking = false; } }

// --- 워크시트 ---
function wsData(id) {
  if (!state.worksheets[id]) state.worksheets[id] = { single: {}, entries: [] };
  return state.worksheets[id];
}
let editingAt = null; // 누적형 기록을 수정 중일 때 그 기록의 at
function renderWorksheet(wrap, m, screen) {
  const append = screen.mode === "append";
  const data = wsData(m.id);
  const draft = state.drafts[m.id] || {};
  const initial = (f) => append ? (draft[f.key] || "") : (draft[f.key] ?? data.single[f.key] ?? "");
  const hasUnsaved = !append && screen.fields.some((f) => draft[f.key] !== undefined && (draft[f.key] || "") !== (data.single[f.key] || ""));
  wrap.innerHTML = `
    <div class="ws-note muted small">${append ? "저장을 누르면 아래에 기록이 하나씩 쌓입니다. 쓰다 만 글은 자동으로 보관됩니다." : "저장을 누르면 내용이 보관되고, 언제든 다시 열어 고칠 수 있습니다."}</div>
    <div id="edit-bar" class="notice" hidden>이전에 쓴 기록을 고치고 있습니다. 고친 뒤 아래 '수정한 내용 저장'을 누르세요. <button class="btn link sm" id="edit-cancel" type="button">고치기 취소</button></div>
    ${screen.fields.map((f, i) => `
    <label class="field">
      <span class="label"><span class="fnum">${i + 1}</span>${esc(f.label)}</span>
      <textarea data-key="${esc(f.key)}" placeholder="${esc(f.placeholder || "")}" rows="3">${esc(initial(f))}</textarea>
    </label>`).join("")}
    ${!append && data.singleAt ? `<p class="status-line" id="single-saved">저장됨 · ${fmtDateTime(data.singleAt)}</p>` : ""}
    ${!append && hasUnsaved ? `<div class="notice" id="draft-bar">저장하지 않은 수정 내용이 있습니다. 아래 '${esc(screen.button || "저장")}'을 누르거나 <button class="btn link sm" id="draft-drop" type="button">수정 내용 버리기</button></div>` : ""}
    ${append ? `<div class="btn-row no-print" id="append-done" ${data.entries.length ? "" : "hidden"}><button class="btn ghost" id="append-next" type="button">다 적었어요 · 다음으로 ›</button></div><div class="entries" id="entries"></div>` : ""}`;
  if ($("#draft-drop")) $("#draft-drop").onclick = () => { delete state.drafts[m.id]; save(); renderWorksheet(wrap, m, screen); };
  if ($("#append-next")) $("#append-next").onclick = () => finishModule(m, "");
  wrap.querySelectorAll("textarea").forEach((ta) => {
    ta.addEventListener("input", () => {
      if (editingAt) { const e = state.drafts[m.id + "@edit"] || (state.drafts[m.id + "@edit"] = { at: editingAt, responses: {} }); e.responses[ta.dataset.key] = ta.value; save(); return; }
      const d = state.drafts[m.id] || (state.drafts[m.id] = {}); d[ta.dataset.key] = ta.value; save();
    });
  });
  editingAt = null;
  if (append) {
    renderEntries(m, screen);
    const pending = state.drafts[m.id + "@edit"]; // 고치다 말고 나갔던 기록이 있으면 이어서
    if (pending && wsData(m.id).entries.some((e) => e.at === pending.at)) startEdit(m, screen, pending.at, pending.responses);
  }
}
function renderEntries(m, screen, justSaved) {
  const wrap = $("#entries"); if (!wrap) return;
  const data = wsData(m.id);
  if (!data.entries.length) { wrap.innerHTML = ""; return; }
  wrap.innerHTML = (justSaved ? `<div class="saved-flash">✓ 방금 쓴 내용이 아래 맨 위에 저장되었습니다. 입력칸은 다음 기록을 위해 비워졌습니다.</div>` : "") + `<h3>지금까지 쓴 기록 <span class="muted">(${data.entries.length}건)</span></h3>` +
    data.entries.slice().reverse().map((en, i) => `
      <div class="entry">
        <div class="when">${data.entries.length - i}번째 · ${fmtDateTime(en.at)}</div>
        ${screen.fields.filter((f) => en.responses[f.key]).map((f) => `<p><span class="q">${esc(f.label)}</span>${esc(en.responses[f.key])}</p>`).join("")}
        <div class="tools no-print"><button class="btn ghost sm" data-edit="${en.at}" type="button">수정</button><button class="btn link sm" data-del="${en.at}" type="button">삭제</button></div>
      </div>`).join("");
  wrap.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => {
    if (!confirm("이 기록을 삭제할까요?")) return;
    if (editingAt === b.dataset.del) cancelEdit(m, screen);
    data.entries = data.entries.filter((e) => e.at !== b.dataset.del);
    save(); renderEntries(m, screen); toast("삭제했습니다.");
  });
  wrap.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => startEdit(m, screen, b.dataset.edit));
}
function startEdit(m, screen, at, pendingResponses) {
  const en = wsData(m.id).entries.find((e) => e.at === at); if (!en) return;
  editingAt = at;
  const src = pendingResponses || en.responses;
  document.querySelectorAll("#fields textarea").forEach((ta) => (ta.value = src[ta.dataset.key] || ""));
  $("#edit-bar").hidden = false; $("#next-btn").textContent = "수정한 내용 저장";
  $("#edit-cancel").onclick = () => cancelEdit(m, screen);
  $("#edit-bar").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
}
function cancelEdit(m, screen) {
  editingAt = null; delete state.drafts[m.id + "@edit"]; save();
  $("#edit-bar").hidden = true; $("#next-btn").textContent = screen.button || "기록 저장";
  document.querySelectorAll("#fields textarea").forEach((ta) => (ta.value = (state.drafts[m.id] || {})[ta.dataset.key] || ""));
}
function submitWorksheet(m, screen) {
  const responses = {};
  document.querySelectorAll("#fields textarea").forEach((ta) => { if (ta.value.trim()) responses[ta.dataset.key] = ta.value.trim(); });
  const data = wsData(m.id);
  if (screen.mode === "append") {
    if (!Object.keys(responses).length) { toast("한 칸이라도 적은 뒤 저장해 주세요."); return false; }
    if (editingAt) {
      const en = data.entries.find((e) => e.at === editingAt);
      if (en) en.responses = responses;
      save();
      cancelEdit(m, screen); // 편집 종료 + 쓰다 만 새 글 복원
      renderEntries(m, screen);
      toast("고친 내용을 저장했습니다 ✓"); return true;
    }
    data.entries.push({ at: new Date().toISOString(), responses });
    delete state.drafts[m.id];
    setStatus(m.id, "completed"); save();
    document.querySelectorAll("#fields textarea").forEach((ta) => (ta.value = ""));
    renderEntries(m, screen, true);
    $("#append-done").hidden = false;
    $("#entries").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
    toast("저장했습니다 ✓ 더 적어도 되고, '다 적었어요'를 눌러 넘어가도 됩니다.", 5000);
    return true;
  }
  if (!Object.keys(responses).length) { toast("한 칸이라도 적은 뒤 저장해 주세요."); return false; }
  data.single = responses; data.singleAt = new Date().toISOString(); delete state.drafts[m.id]; save();
  toast("저장했습니다 ✓");
  const sl = $("#single-saved"); if (sl) sl.textContent = `저장됨 · ${fmtDateTime(data.singleAt)}`; const db = $("#draft-bar"); if (db) db.remove();
  return true;
}

// --- 설문 (THI) ---
function renderQuestionnaire(wrap, m, screen) {
  const q = P.questionnaires[screen.questionnaire_type];
  if (!q) { wrap.innerHTML = `<p class="muted">이 설문은 클리닉 방문 시 진행됩니다.</p>`; return; }
  const prev = state.questionnaires.find((r) => r.type === q.type && r.timepoint === screen.timepoint_label);
  const draft = Object.keys(state.drafts[m.id] || {}).length ? state.drafts[m.id] : (prev ? prev.answers : {});
  wrap.innerHTML = `
    ${prev ? `<div class="notice ok">이미 ${fmtDateTime(prev.at)}에 제출한 설문입니다 (총점 ${prev.total}점). 이전 답이 채워져 있으니 고칠 문항만 바꾸고 다시 제출하면 새 결과로 바뀝니다. <a href="#/results">결과 보기</a></div>` : ""}
    <div class="card"><p class="muted" style="margin:0">${esc(q.instruction)}</p><p class="muted small" style="margin:8px 0 0">답한 내용은 자동으로 보관되어, 중간에 나갔다 와도 이어서 할 수 있습니다.</p></div>
    <div class="q-progress muted small" id="q-progress"></div>
    ${q.items.map((it, i) => `
      <div class="q-item" data-key="${it.key}">
        <div class="q-text"><span class="q-num">${i + 1}</span>${esc(it.text)}</div>
        <div class="q-opts">${q.options.map((o) => `<label><input type="radio" name="${it.key}" value="${o.value}" ${String(draft[it.key]) === String(o.value) ? "checked" : ""}><span>${esc(o.label)}</span></label>`).join("")}</div>
      </div>`).join("")}`;
  const updateProgress = () => { const n = q.items.filter((it) => document.querySelector(`input[name="${it.key}"]:checked`)).length; $("#q-progress").textContent = `${n} / ${q.items.length} 문항 답함`; };
  wrap.querySelectorAll("input[type=radio]").forEach((r) => r.addEventListener("change", () => { const d = state.drafts[m.id] || (state.drafts[m.id] = {}); d[r.name] = r.value; save(); updateProgress(); }));
  updateProgress();
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
  if (firstMissing) { toast("아직 답하지 않은 문항이 있습니다. 붉게 표시된 문항을 확인해 주세요."); firstMissing.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "center" }); return; }
  const total = Object.values(answers).reduce((a, b) => a + b, 0);
  state.questionnaires = state.questionnaires.filter((r) => !(r.type === q.type && r.timepoint === screen.timepoint_label));
  state.questionnaires.push({ type: q.type, timepoint: screen.timepoint_label, at: new Date().toISOString(), answers, total, severity: thiSeverity(total) });
  delete state.drafts[m.id]; delete state.resume[m.id];
  setStatus(m.id, "completed"); save();
  location.hash = "#/results";
}

function renderResults(main) {
  const q = P.questionnaires.THI;
  const rs = state.questionnaires.filter((r) => r.type === "THI").sort((a, b) => a.at.localeCompare(b.at));
  const tpLabel = { baseline: "시작 평가 (1주차)", week8: "종료 평가 (8주차)" };
  const box = (r) => `<div class="card"><div class="eyebrow">${tpLabel[r.timepoint] || r.timepoint}</div>
      <div class="stat">${r.total}<small>/ 100</small></div>
      <div><span class="pill">${esc(q.severity_labels[r.severity] || r.severity)}</span></div><p class="muted small" style="margin:8px 0 0">등급은 참고용입니다. 다음 진료에서 선생님과 함께 봅니다.</p>
      <p class="muted small" style="margin-top:8px">${fmtDateTime(r.at)}</p></div>`;
  const base = rs.find((r) => r.timepoint === "baseline"), end = rs.find((r) => r.timepoint === "week8");
  let diff = "";
  if (base && end) {
    const d = base.total - end.total;
    diff = `<div class="notice ${d > 0 ? "ok" : ""}">시작 시점과 비교해 총점이 ${Math.abs(d)}점 ${d > 0 ? "낮아졌습니다" : d < 0 ? "높아졌습니다" : "같습니다"}. 결과는 다음 진료에서 담당 선생님과 함께 살펴봅니다.</div>`;
  }
  main.innerHTML = `
    <section class="hero" style="padding-bottom:20px"><div class="eyebrow">이명장애지수 (THI)</div><h1>설문 결과</h1>
      <p class="lead">총점이 낮을수록 이명이 일상에 미치는 영향이 적다는 뜻입니다. 점수는 진단이 아니라 변화를 보기 위한 기준점입니다.</p></section>
    ${diff}
    ${rs.length ? `<div class="result-compare">${rs.map(box).join("")}</div>` : `<div class="card"><p class="muted">아직 제출한 설문이 없습니다.</p></div>`}
    <div class="btn-row"><a class="btn ghost" href="#/program">프로그램 목록</a><a class="btn ghost" href="#/records">나의 기록</a></div>`;
}

// =====================================================================
//  오늘의 일기
// =====================================================================
function renderToday(main, [dateArg]) {
  const key = dateArg && /^\d{4}-\d{2}-\d{2}$/.test(dateArg) ? dateArg : dateKey();
  const isToday = key === dateKey();
  const d = state.diary[key] || {};
  const saved = !!d.at;
  const slider = (id, label, hint, val, lo, hi) => `
    <div class="slider ${val == null ? "unset" : ""}" id="sl-${id}">
      <div class="slider-head"><span class="label" style="font-weight:500">${label}</span><span class="val"><output id="out-${id}">${val ?? "–"}</output><small> / 10</small></span></div>
      <div class="scale" role="radiogroup" aria-label="${label}">${Array.from({ length: 11 }, (_, v) => `<button type="button" class="${val === v ? "on" : ""}" data-id="${id}" data-v="${v}" aria-pressed="${val === v}">${v}</button>`).join("")}</div>
      <div class="ends"><span>0 = ${lo}</span><span>10 = ${hi}</span></div>
      ${hint ? `<div class="muted small">${hint}</div>` : ""}
    </div>`;
  main.innerHTML = `
    <section class="hero" style="padding-bottom:12px">
      <div class="eyebrow">${isToday ? "오늘" : weekdayKo[new Date(key + "T00:00:00").getDay()] + "요일"} · ${fmtDate(key)}</div>
      <h1>${isToday ? "오늘의 일기" : "지난 일기"}</h1>
      <p class="lead">${saved ? "이미 저장된 기록입니다. 고친 뒤 다시 저장하면 됩니다." : "1분이면 충분합니다. 정확하지 않아도 괜찮으니 지금 느끼는 대로 남겨 주세요."}</p>
      <div class="date-nav no-print">
        <a class="btn ghost sm" href="#/today/${shiftDate(key, -1)}">‹ 전날</a>
        ${isToday ? `<span class="pill">오늘</span>` : `<a class="btn ghost sm" href="#/today">오늘로</a>`}
        ${isToday ? "" : `<a class="btn ghost sm" href="#/today/${shiftDate(key, 1)}">다음 날 ›</a>`}
      </div>
    </section>
    <form class="card" id="diary-form">
      <p class="muted" style="margin:0 0 16px">숫자를 눌러 고르세요.</p>
      ${slider("tinnitus", "오늘 이명의 크기", "", d.tinnitus ?? null, "거의 안 들림", "매우 큼")}
      ${slider("annoyance", "오늘 이명이 신경 쓰인 정도", "", d.annoyance ?? null, "전혀", "매우")}
      ${slider("sleep", "간밤 수면에 미친 영향", "이명이 잠드는 것을 얼마나 방해했나요", d.sleep ?? null, "전혀", "매우")}
      <hr class="divider">
      <label class="check"><input type="checkbox" id="in-mindfulness" ${d.mindfulness ? "checked" : ""}> 마음챙김 호흡을 했어요</label>
      <label class="check"><input type="checkbox" id="in-pmr" ${d.pmr ? "checked" : ""}> 근육이완을 했어요</label>
      <hr class="divider">
      <label class="field"><span class="label">이명이 더 심해진 계기 <span class="muted">(선택)</span></span><input type="text" id="in-trigger" value="${esc(d.trigger || "")}" placeholder="예: 시끄러운 곳, 피로, 커피"></label>
      <label class="field"><span class="label">메모 <span class="muted">(선택)</span></span><span class="hint">오늘 느낀 점을 자유롭게. 연습한 것(이완 전후 긴장도, 잠든 시간 등)을 적어 두면 진료 때 도움이 됩니다.</span><textarea id="in-memo" placeholder="예: 근육이완 20분, 긴장도 7 → 3">${esc(d.memo || "")}</textarea></label>
      <div class="btn-row between sticky-actions">${dateArg ? `<button class="btn ghost" type="button" id="diary-cancel">취소</button>` : `<a class="btn link" href="#/records">지난 기록 보기</a>`}<button class="btn accent big" type="submit">${saved ? "고친 내용 저장" : "저장"}</button></div>
      <p id="diary-status" class="status-line" ${saved ? "" : "hidden"}>${saved ? `마지막 저장 ${fmtDateTime(d.at)}` : ""}</p>
    </form>`;
  const vals = { tinnitus: d.tinnitus ?? null, annoyance: d.annoyance ?? null, sleep: d.sleep ?? null };
  main.querySelectorAll(".scale button").forEach((b) => b.onclick = () => {
    const id = b.dataset.id, v = Number(b.dataset.v); vals[id] = v;
    b.parentElement.querySelectorAll("button").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
    $(`#out-${id}`).textContent = v; $(`#sl-${id}`).classList.remove("unset");
  });
  $("#diary-form").onsubmit = (e) => {
    e.preventDefault();
    const missing = ["tinnitus", "annoyance", "sleep"].find((k) => vals[k] == null);
    if (missing) { toast("세 가지 점수를 모두 골라 주세요."); $(`#sl-${missing}`).scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "center" }); return; }
    state.diary[key] = {
      tinnitus: vals.tinnitus, annoyance: vals.annoyance, sleep: vals.sleep,
      mindfulness: $("#in-mindfulness").checked, pmr: $("#in-pmr").checked,
      trigger: $("#in-trigger").value.trim(), memo: $("#in-memo").value.trim(), at: new Date().toISOString(),
    };
    save(); toast("일기를 저장했습니다 ✓");
    if (dateArg && history.length > 1) history.back(); else location.hash = "#/";
  };
  if ($("#diary-cancel")) $("#diary-cancel").onclick = () => (history.length > 1 ? history.back() : (location.hash = "#/records"));
}

// =====================================================================
//  사운드 (유튜브 재생 + 사용 기록)
// =====================================================================
let yt = { player: null, current: null, session: null, tick: null };

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
  const anyReady = S.groups.some((g) => g.items.some((it) => it.youtubeId));
  if (!anyReady) {
    main.innerHTML = `<section class="hero"><div class="eyebrow">소리 치료</div><h1>소리</h1><p class="lead">클리닉에서 소리를 안내해 드리면 여기에 표시됩니다. 아직 준비 중입니다.</p></section>`;
    return;
  }
  main.innerHTML = `
    <section class="hero" style="padding-bottom:16px">
      <div class="eyebrow">소리 치료</div>
      <h1>소리</h1>
      <p class="lead">${esc(S.note)}</p>
    </section>
    <div class="card">
      <div class="player" id="player-wrap"><div class="empty" id="player-empty">아래에서 소리를 골라 누르세요</div><div id="yt-player"></div></div>
      <div class="kv"><span id="now-playing" class="muted">선택된 소리 없음</span><span class="timer" id="timer">00:00</span></div>
      <div class="btn-row"><button class="btn ghost" id="stop-btn" type="button" hidden>■ 멈추기</button></div>
      <p class="muted small" style="margin:8px 0 0">재생을 누르면 사용 시간이 자동으로 기록되고, 밤 10시~아침 6시 사용은 야간으로 구분됩니다. 휴대폰 화면이 꺼지면 재생이 멈출 수 있으니 취침 시에는 화면 자동 잠금을 길게 설정해 두세요.</p>
    </div>
    ${S.groups.map((g) => `
      <section class="section">
        <div class="section-head"><h2>${esc(g.title)}</h2></div>
        <p class="muted">${esc(g.desc)}</p>
        <div class="sound-list">${g.items.map((it) => `
          <button class="sound-item ${it.youtubeId ? "" : "na"}" data-id="${it.id}" ${it.youtubeId ? "" : "disabled"} type="button">
            <span class="st">${esc(it.title)}</span>
            <span class="sd">${it.youtubeId ? esc(it.desc) : "준비 중"}</span>
          </button>`).join("")}</div>
      </section>`).join("")}
    <section class="section">
      <div class="section-head"><h2>최근 사용 기록</h2><a class="more" href="#/records">전체 보기</a></div>
      <div class="card" id="sound-log">${renderSoundLog(7)}</div>
    </section>`;
  document.querySelectorAll(".sound-item:not(.na)").forEach((b) => b.onclick = () => playSound(b.dataset.id));
  $("#stop-btn").onclick = () => { try { yt.player?.pauseVideo(); } catch (e) {} endSession(); $("#stop-btn").hidden = true; };
  updateTimer();
}

async function playSound(id) {
  const item = allSounds().find((s) => s.id === id);
  if (!item || !item.youtubeId) return;
  destroyPlayer(); // 세션 종료 + 기존 플레이어 제거 (loop 목록이 이전 영상에 고정되지 않도록 매번 새로 만듦)
  yt.current = item;
  markPlaying(id);
  const wrap = $("#player-wrap");
  $("#player-empty").hidden = true;
  $("#now-playing").textContent = item.title;
  if (!$("#yt-player")) { const d = document.createElement("div"); d.id = "yt-player"; wrap.appendChild(d); }
  await loadYouTubeAPI();
  if (yt.current !== item || !$("#yt-player")) return; // 로딩 중 다른 소리를 골랐거나 화면을 떠남
  yt.player = new YT.Player("yt-player", {
    host: "https://www.youtube-nocookie.com",
    videoId: item.youtubeId,
    playerVars: { autoplay: 1, loop: 1, playlist: item.youtubeId, rel: 0, modestbranding: 1, playsinline: 1 },
    events: { onStateChange: onPlayerState },
  });
}
function destroyPlayer() {
  endSession();
  if (yt.player) { try { yt.player.destroy(); } catch (e) { /* 이미 사라짐 */ } }
  yt.player = null; yt.current = null;
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
  const sb = $("#stop-btn"); if (sb) sb.hidden = false;
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
    const log = $("#sound-log"); if (log) log.innerHTML = renderSoundLog(7);
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
window.addEventListener("pagehide", endSession);

function renderSoundLog(days, limit = 8) {
  const since = Date.now() - days * 86400000;
  const list = state.soundSessions.filter((s) => new Date(s.startedAt) >= since).slice().reverse();
  if (!list.length) return `<p class="muted" style="margin:0">최근 ${days}일 사용 기록이 없습니다.</p>`;
  const total = list.reduce((a, s) => a + s.durationSec, 0);
  return `<div class="kv" style="margin-bottom:10px"><span>최근 ${days}일 합계</span><b>${fmtDur(total)}</b></div>
    <ul class="list-plain">${list.slice(0, limit).map((s) => `<li class="kv"><span>${fmtDateTime(s.startedAt)} · ${esc(s.title)} <span class="pill">${s.timeOfDay === "night" ? "야간" : "주간"}</span></span><span>${fmtDur(s.durationSec)}</span></li>`).join("")}</ul>${list.length > limit ? `<p class="muted small" style="margin:8px 0 0">외 ${list.length - limit}건</p>` : ""}`;
}
function fmtDur(sec) {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return h ? `${h}시간 ${m}분` : `${m}분`;
}

// =====================================================================
//  나의 기록
// =====================================================================
function renderRecords(main) {
  const days = Object.keys(state.diary).filter((k) => state.diary[k].at || state.diary[k].partial).sort();
  const chartDays = days.filter((k) => state.diary[k].at);
  const wsList = P.modules.filter((m) => m.kind === "write" || m.id === "week8_act");
  main.innerHTML = `
    <section class="hero" style="padding-bottom:16px">
      <div class="eyebrow">나의 기록</div>
      <h1>기록</h1>
      <p class="lead">일기, 워크시트, 설문, 소리 치료 사용 기록을 한곳에서 봅니다. 날짜나 제목을 누르면 다시 열어 고칠 수 있습니다.</p>
      <div class="btn-row no-print"><a class="btn accent" href="#/share">진료 때 QR로 전달</a><button class="btn ghost" id="print-btn" type="button">인쇄 / PDF</button></div>
    </section>

    <section class="section">
      <div class="section-head"><h2>일기 추이</h2><a class="more" href="#/today">오늘 일기</a></div>
      <div class="card">${chartDays.length >= 2 ? renderChart(chartDays) : `<p class="muted" style="margin:0">일기를 이틀 이상 기록하면 추이가 표시됩니다.</p>`}</div>
      <div class="card">
        ${days.length ? `<div class="table-wrap"><table><thead><tr><th>날짜</th><th>크기</th><th>신경 쓰임</th><th>수면</th><th>실습</th><th>메모</th><th class="no-print"></th></tr></thead><tbody>
          ${days.slice().reverse().map((k) => { const d = state.diary[k]; return `<tr class="rowlink" data-href="#/today/${k}"><td><a href="#/today/${k}">${k.slice(2)}</a></td><td class="num">${d.tinnitus ?? "–"}</td><td class="num">${d.annoyance ?? "–"}</td><td class="num">${d.sleep ?? "–"}</td><td>${[d.mindfulness ? "마음챙김" : "", d.pmr ? "근육이완" : ""].filter(Boolean).join(", ")}</td><td class="small">${esc([d.trigger, d.memo].filter(Boolean).join(" · "))}</td><td class="no-print"><a class="btn ghost sm" href="#/today/${k}">고치기</a></td></tr>`; }).join("")}
        </tbody></table></div>` : `<p class="muted" style="margin:0">아직 일기가 없습니다.</p>`}
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>워크시트</h2></div>
      ${wsList.map((m) => {
        const d = state.worksheets[m.id]; if (!d) return "";
        const fields = m.screens.filter((s) => s.type === "worksheet").flatMap((s) => s.fields);
        const single = Object.keys(d.single || {}).length ? `<div class="entry">${fields.filter((f) => d.single[f.key]).map((f) => `<p><span class="q">${esc(f.label)}</span>${esc(d.single[f.key])}</p>`).join("")}</div>` : "";
        const entries = (d.entries || []).slice().reverse().map((en) => `<div class="entry"><div class="when">${fmtDateTime(en.at)}</div>${fields.filter((f) => en.responses[f.key]).map((f) => `<p><span class="q">${esc(f.label)}</span>${esc(en.responses[f.key])}</p>`).join("")}</div>`).join("");
        if (!single && !entries) return "";
        return `<div class="card"><div class="section-head"><h3>${esc(m.title)}</h3><a class="more" href="#/module/${m.id}/${m.screens.findIndex((s) => s.type === "worksheet")}${(d.entries || []).length ? "/entries" : "/back"}">열어서 고치기</a></div>${single}${entries}</div>`;
      }).join("") || `<div class="card"><p class="muted" style="margin:0">아직 작성한 워크시트가 없습니다.</p></div>`}
    </section>

    <section class="section">
      <div class="section-head"><h2>설문 (THI)</h2><a class="more" href="#/results">결과 비교</a></div>
      <div class="card">${state.questionnaires.length ? `<ul class="list-plain">${state.questionnaires.map((r) => `<li class="kv"><span>${r.timepoint === "baseline" ? "시작 평가" : "종료 평가"} · ${fmtDateTime(r.at)}</span><b>${r.total}점 <span class="pill">${esc(P.questionnaires.THI.severity_labels[r.severity])}</span></b></li>`).join("")}</ul>` : `<p class="muted" style="margin:0">아직 제출한 설문이 없습니다.</p>`}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>소리 치료 사용</h2><a class="more" href="#/sound">사운드</a></div>
      <div class="card">${renderSoundLog(30, 60)}</div>
    </section>`;
  $("#print-btn").onclick = () => window.print();
  main.querySelectorAll("tr.rowlink").forEach((tr) => tr.onclick = (e) => { if (e.target.closest("a")) return; location.hash = tr.dataset.href; });
}

// 일기 추이 — 3개 시리즈 선 그래프 (SVG). 색은 dataviz 검증을 통과한 3색.
const SERIES = [
  { key: "tinnitus", label: "이명 크기", color: "#C2542F" },
  { key: "annoyance", label: "신경 쓰인 정도", color: "#2F6FB3" },
  { key: "sleep", label: "수면 영향", color: "#6B7F2E" },
];
function renderChart(days, diary = state.diary) {
  const last = days.slice(-42); // 최근 6주
  const W = 720, H = 240, L = 34, R = 16, T = 16, B = 34;
  const iw = W - L - R, ih = H - T - B;
  const x = (i) => L + (last.length === 1 ? iw / 2 : (i / (last.length - 1)) * iw);
  const y = (v) => T + ih - (v / 10) * ih;
  const grid = [0, 5, 10].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#DBD7CB" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#7C7A73">${v}</text>`).join("");
  const step = Math.max(1, Math.ceil(last.length / 6));
  const xlabels = last.map((k, i) => (i % step === 0 || i === last.length - 1) ? `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#7C7A73">${k.slice(5).replace("-", "/")}</text>` : "").join("");
  const lines = SERIES.map((s) => {
    const pts = last.map((k, i) => `${x(i).toFixed(1)},${y(diary[k][s.key]).toFixed(1)}`).join(" ");
    const dots = last.map((k, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(diary[k][s.key]).toFixed(1)}" r="3.5" fill="${s.color}" stroke="#FCFBF8" stroke-width="2"><title>${k} ${s.label} ${diary[k][s.key]}</title></circle>`).join("");
    return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
  }).join("");
  return `<div class="chart-wrap"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="최근 일기 추이 그래프">${grid}${xlabels}${lines}</svg></div>
    <div class="legend">${SERIES.map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join("")}</div>`;
}

// =====================================================================
//  기록 전달 (QR)
// =====================================================================
function renderShare(main) {
  main.innerHTML = `
    <section class="hero" style="padding-bottom:12px">
      <div class="eyebrow">진료 때</div>
      <h1>기록 전달</h1>
      <p class="lead">이 화면을 열어 선생님께 보여 주세요. 병원 태블릿으로 QR을 읽습니다. 다 받으면 선생님이 알려 드립니다. 화면 밝기를 최대로 올려 두면 좋습니다.</p>
    </section>
    <div class="card share-card">
      <div class="qr-wrap" id="qr"><div class="muted">준비 중…</div></div>
      <div class="qr-meta"><span id="qr-progress" class="muted">준비 중</span><span id="qr-hint" class="muted small"></span></div>
      <details class="staff no-print"><summary>직원용 조절</summary><div class="btn-row center">
        <button class="btn ghost sm" id="qr-slower" type="button">천천히</button>
        <button class="btn ghost sm" id="qr-restart" type="button">처음부터</button>
      </div></details>
    </div>
    <div class="card tint">
      <h3>QR이 잘 안 읽힐 때</h3>
      <p class="muted">화면 밝기를 최대로 하고 QR과 카메라 사이를 20~30cm로 유지해 주세요. 태블릿 화면에 "몇 조각을 받았는지"가 표시되며, 못 받은 조각은 QR이 다시 돌아올 때 자동으로 채워집니다.</p>
      <p class="muted">그래도 어려우면 <a href="#/settings">설정</a>에서 파일로 내보내 전달할 수 있습니다.</p>
    </div>`;
  let frames = [], i = 0, timer = null, interval = 700;
  const qrEl = $("#qr"), prog = $("#qr-progress");
  function draw() {
    if (!frames.length) return;
    const qr = qrcode(0, "M"); qr.addData(frames[i], "Byte"); qr.make();
    qrEl.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
    prog.textContent = `조각 ${i + 1} / ${frames.length}`;
    i = (i + 1) % frames.length;
  }
  function start() { clearInterval(timer); i = 0; draw(); timer = setInterval(draw, interval); }
  let lock = null; if (navigator.wakeLock) navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {}); // 보여주는 동안 화면이 꺼지지 않게
  cleanup = () => { clearInterval(timer); if (lock) lock.release().catch(() => {}); };
  Transfer.encode(state).then(({ frames: f, bytes }) => {
    frames = f;
    $("#qr-hint").textContent = `전체 ${frames.length}조각 · ${(bytes / 1024).toFixed(1)}KB · 약 ${Math.ceil(frames.length * interval / 1000)}초에 한 바퀴`;
    start();
  }).catch((e) => { qrEl.innerHTML = `<p class="muted">QR을 만들지 못했습니다. 설정에서 파일로 내보내 전달해 주세요.</p>`; });
  $("#qr-slower").onclick = () => { interval = interval >= 1500 ? 700 : interval + 400; $("#qr-slower").textContent = interval >= 1500 ? "보통 속도" : "천천히"; start(); };
  $("#qr-restart").onclick = start;
}

// 병원 사본(압축 표현) → 앱 상태 복원
function stateFromCompact(c) {
  const ex = Transfer.expand(c);
  const st = DEFAULT_STATE();
  st.profile.id = ex.id || st.profile.id; st.profile.nickname = ex.nickname || ""; st.profile.startDate = ex.startDate || null;
  for (const id of ex.done) st.progress[id] = "completed";
  st.worksheets = Object.fromEntries(Object.entries(ex.worksheets).map(([k, w]) => [k, { single: w.single, entries: w.entries, singleAt: w.singleAt || undefined }]));
  st.questionnaires = ex.questionnaires.map((q) => ({ ...q, answers: Object.fromEntries(String(q.answers || "").split("").map((v, i) => ["q" + (i + 1), Number(v)])) }));
  for (const [k, d] of Object.entries(ex.diary)) st.diary[k] = { ...d, at: k + "T12:00:00.000Z" };
  st.soundSessions = ex.sounds.flatMap((s) => [["day", s.daySec], ["night", s.nightSec]].filter(([, sec]) => sec > 0).map(([tod, sec]) => ({ soundId: "restored", title: "복원된 기록", startedAt: s.day + (tod === "day" ? "T12:00:00.000Z" : "T23:00:00.000Z"), endedAt: null, durationSec: sec, timeOfDay: tod })));
  return st;
}

// =====================================================================
//  설정 / 내보내기 / 가져오기
// =====================================================================
function renderSettings(main) {
  const p = state.profile;
  main.innerHTML = `
    <section class="hero" style="padding-bottom:16px"><div class="eyebrow">설정</div><h1>설정과 데이터</h1>
      <p class="lead">모든 기록은 이 기기의 브라우저에만 저장됩니다. 기기를 바꾸거나 브라우저 데이터를 지우면 사라지므로, 진료 때 QR로 전달하거나 정기적으로 파일로 내보내 두세요.</p></section>
    <div class="card">
      <h3>보기</h3>
      <div class="field"><span class="label">글자 크기</span>
        <div class="seg" id="font-seg">
          ${[[1, "보통"], [1.15, "크게"], [1.3, "아주 크게"]].map(([v, l]) => `<button type="button" class="${Number(p.fontScale || 1) === v ? "on" : ""}" data-v="${v}">${l}</button>`).join("")}
        </div></div>
    </div>
    <div class="card">
      <h3>프로그램</h3>
      <label class="field"><span class="label">시작일</span><input type="date" id="s-start" value="${p.startDate || ""}"></label>
      <label class="field"><span class="label">이름 또는 별칭</span><input type="text" id="s-name" value="${esc(p.nickname)}" maxlength="20"></label>
      <label class="check"><input type="checkbox" id="s-unlock" ${p.unlockAll ? "checked" : ""}> 모든 주차 열기 <span class="muted small">(클리닉 안내에 따라 필요할 때만)</span></label>
      <p class="muted small">기록 번호: <b>${esc(p.id)}</b> — 진료 때 기록을 구분하는 번호입니다.</p>
      <div class="btn-row"><button class="btn" id="s-save" type="button">저장</button></div>
    </div>
    <div class="card">
      <h3>데이터 내보내기 · 가져오기</h3>
      <p class="muted">내보낸 파일(JSON)에는 일기, 워크시트, 설문, 소리 사용 기록이 모두 담깁니다. 새 기기로 옮기거나 담당 선생님께 전달할 때 씁니다.</p>
      <div class="btn-row"><button class="btn" id="s-export" type="button">파일로 내보내기</button><button class="btn ghost" id="s-import" type="button">파일 가져오기</button><input type="file" id="s-file" accept="application/json,.json" hidden></div>
    </div>
    <div class="card">
      <h3>초기화</h3>
      <p class="muted">이 기기의 모든 기록을 지웁니다. 되돌릴 수 없으니 먼저 내보내기를 해 두세요.</p>
      <div class="btn-row"><button class="btn ghost" id="s-reset" type="button" style="color:var(--accent-ink)">모든 기록 지우기</button></div>
    </div>`;
  $("#font-seg").querySelectorAll("button").forEach((b) => b.onclick = () => {
    p.fontScale = Number(b.dataset.v); save(); applyFontScale();
    $("#font-seg").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
  });
  $("#s-save").onclick = () => {
    p.startDate = $("#s-start").value || p.startDate; p.nickname = $("#s-name").value.trim(); p.unlockAll = $("#s-unlock").checked;
    save(); toast("저장했습니다 ✓");
  };
  $("#s-export").onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `이명기록_${p.nickname || p.id}_${dateKey()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $("#s-import").onclick = () => $("#s-file").click();
  $("#s-file").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      let next = null;
      if (data && data.profile) next = Object.assign(DEFAULT_STATE(), data);
      else if (data && data.compact) next = stateFromCompact(data.compact); // 병원 태블릿에서 내려받은 사본
      if (!next) throw new Error();
      if (!confirm("현재 기기의 기록을 이 파일의 내용으로 바꿀까요?")) return;
      state = next; save(); applyFontScale(); toast(data.compact ? "병원 사본에서 복원했습니다 ✓ (글자 크기·설정과 소리 사용 상세 기록은 복원되지 않습니다)" : "가져왔습니다 ✓", 6000); location.hash = "#/";
    } catch (err) { toast("파일을 읽을 수 없습니다."); }
  };
  $("#s-reset").onclick = () => {
    if (!confirm("정말 모든 기록을 지울까요? 되돌릴 수 없습니다.")) return;
    if (!confirm("마지막 확인입니다. 지우시겠습니까?")) return;
    state = DEFAULT_STATE(); save(); location.hash = "#/"; toast("모든 기록을 지웠습니다.");
  };
}
