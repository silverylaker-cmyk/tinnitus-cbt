/* 의료진용 태블릿 페이지 — 환자 폰의 QR을 카메라로 읽어 기록을 저장하고 열람 */
"use strict";

const CKEY = "tinnitus_clinic_v1";
const P = window.PROGRAM;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const fmtDT = (iso) => { if (!iso) return "-"; const d = new Date(iso); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDur = (sec) => { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? `${h}시간 ${m}분` : `${m}분`; };

let db = load();
function load() { try { return Object.assign({ patients: {}, notes: {} }, JSON.parse(localStorage.getItem(CKEY) || "{}")); } catch (e) { return { patients: {}, notes: {} }; } }
function save() { localStorage.setItem(CKEY, JSON.stringify(db)); }
let toastTimer;
function toast(msg, ms = 4000) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms); }

// 받은 기록 저장 (같은 환자는 최신 것으로 교체, 받은 날짜 이력은 유지)
function storeRecord(compact) {
  const id = compact.id || ("NOID-" + (compact.n || "?"));
  const prev = db.patients[id];
  if (prev) {
    const oldN = (prev.compact.d || []).length, newN = (compact.d || []).length;
    if (newN < oldN && !confirm(`이전에 받은 기록(일기 ${oldN}일)보다 적은 기록(일기 ${newN}일)입니다. 환자 폰의 기록이 지워졌을 수 있습니다. 그래도 바꿀까요? (취소하면 이전 기록을 유지합니다)`)) return id;
  }
  db.patients[id] = { compact, receivedAt: new Date().toISOString(), history: [...(prev?.history || []), new Date().toISOString()].slice(-20) };
  save();
  return id;
}

// ---------- 라우터 ----------
const routes = { "": renderScan, scan: renderScan, patients: renderPatients, patient: renderPatient, data: renderData };
let cleanup = null;
function route() {
  const [name, ...rest] = location.hash.replace(/^#\/?/, "").split("/");
  if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
  const main = $("#main"); main.innerHTML = "";
  (routes[name] || renderScan)(main, rest);
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === (name || "scan") || (name === "patient" && a.dataset.route === "patients")));
  window.scrollTo({ top: 0 });
}
window.addEventListener("hashchange", route);
window.addEventListener("load", route);

// ---------- QR 스캔 ----------
function renderScan(main) {
  main.innerHTML = `
    <section class="hero" style="padding-bottom:12px">
      <div class="eyebrow">진료실</div>
      <h1>환자 기록 받기</h1>
      <p class="lead">환자 앱의 <b>기록 전달 (QR)</b> 화면을 카메라 앞에 두세요. QR이 여러 조각으로 바뀌며 표시되고, 모두 받으면 자동으로 저장됩니다.</p>
    </section>
    <div class="card">
      <div class="scan"><video id="cam" playsinline muted autoplay></video><div class="frame"></div>
        <div class="overlay"><span id="scan-state">카메라 준비 중…</span><span id="scan-count"></span></div></div>
      <div class="chips" id="chips"></div>
      <div class="btn-row"><button class="btn" id="cam-start" type="button">카메라 켜기</button><button class="btn ghost" id="cam-flip" type="button">카메라 전환</button><button class="btn ghost" id="scan-reset" type="button">처음부터</button></div>
      <p class="muted small" style="margin:12px 0 0">카메라가 켜지지 않으면 브라우저 주소창의 카메라 권한을 허용해 주세요. 환자가 파일로 내보낸 경우 <a href="#/data">백업</a> 화면에서 가져올 수 있습니다.</p>
    </div>
    <section class="section"><div class="section-head"><h2>최근 받은 기록</h2><a class="more" href="#/patients">전체 목록</a></div><div class="card">${recentList(5)}</div></section>`;

  const video = $("#cam"), stateEl = $("#scan-state"), countEl = $("#scan-count"), chips = $("#chips");
  const col = Transfer.collector();
  let stream = null, raf = null, facing = "environment", lastScan = 0, done = false;
  const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });

  function showProgress(st) {
    countEl.textContent = st ? `조각 ${st.got} / ${st.n}` : "";
    chips.innerHTML = st ? Array.from({ length: st.n }, (_, k) => `<i class="${st.missing.includes(k + 1) ? "" : "got"}">${k + 1}</i>`).join("") : "";
  }
  async function handleText(text) {
    if (done) return;
    const st = col.add(text);
    if (!st) return;
    stateEl.textContent = "읽는 중…";
    showProgress(st);
    if (st.complete) {
      done = true;
      try {
        const compact = await col.result();
        const id = storeRecord(compact);
        stateEl.textContent = "저장 완료 ✓";
        toast(`${compact.n || id} 님의 기록을 저장했습니다 ✓`);
        stop();
        setTimeout(() => (location.hash = `#/patient/${id}`), 600);
      } catch (e) { stateEl.textContent = "해독 실패 — 처음부터 다시 시도해 주세요"; done = false; col.reset(); showProgress(null); }
    }
  }
  window.clinicTestDecode = handleText; // 카메라 없이 테스트할 때 사용

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!video.videoWidth || ts - lastScan < 100) return;
    lastScan = ts;
    const scale = Math.min(1, 640 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const res = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
    if (res && res.data) handleText(res.data);
  }
  async function start() {
    stop();
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      video.srcObject = stream; await video.play();
      stateEl.textContent = "QR을 비춰 주세요"; done = false;
      raf = requestAnimationFrame(loop);
    } catch (e) { stateEl.textContent = "카메라를 열 수 없습니다: " + (e.message || e.name); }
  }
  function stop() { cancelAnimationFrame(raf); raf = null; if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }
  $("#cam-start").onclick = start;
  $("#cam-flip").onclick = () => { facing = facing === "environment" ? "user" : "environment"; start(); };
  $("#scan-reset").onclick = () => { col.reset(); done = false; showProgress(null); stateEl.textContent = stream ? "QR을 비춰 주세요" : "카메라 준비 중…"; };
  cleanup = () => { stop(); delete window.clinicTestDecode; };
  if (navigator.mediaDevices?.getUserMedia) start(); else stateEl.textContent = "이 브라우저는 카메라를 지원하지 않습니다 (HTTPS 필요)";
}

function recentList(n) {
  const rows = Object.entries(db.patients).sort((a, b) => b[1].receivedAt.localeCompare(a[1].receivedAt)).slice(0, n);
  if (!rows.length) return `<p class="muted" style="margin:0">아직 받은 기록이 없습니다.</p>`;
  return rows.map(([id, r]) => patientRow(id, r)).join("");
}
function patientRow(id, r) {
  const ex = Transfer.expand(r.compact);
  const week = ex.startDate ? Math.min(8, Math.floor((Date.now() - new Date(ex.startDate + "T00:00:00")) / 86400000 / 7) + 1) : "-";
  return `<a class="patient-row" href="#/patient/${esc(id)}"><span class="pid">${esc(ex.nickname || "(이름 없음)")}</span><span class="meta">번호 ${esc(id)} · ${week}주차 · 일기 ${Object.keys(ex.diary).length}일 · 받음 ${fmtDT(r.receivedAt)}</span><span class="chev">›</span></a>`;
}

// ---------- 환자 목록 ----------
function renderPatients(main) {
  const rows = Object.entries(db.patients).sort((a, b) => b[1].receivedAt.localeCompare(a[1].receivedAt));
  main.innerHTML = `
    <section class="hero" style="padding-bottom:12px"><div class="eyebrow">진료실</div><h1>환자 목록</h1><p class="lead">받은 순서대로 표시됩니다. 같은 환자의 기록을 다시 받으면 최신 내용으로 바뀝니다.</p></section>
    <div class="card">${rows.length ? rows.map(([id, r]) => patientRow(id, r)).join("") : `<p class="muted" style="margin:0">아직 받은 기록이 없습니다. <a href="#/scan">QR 받기</a></p>`}</div>`;
}

// ---------- 환자 상세 ----------
const SERIES = [
  { key: "tinnitus", label: "이명 크기", color: "#C2542F" },
  { key: "annoyance", label: "신경 쓰인 정도", color: "#2F6FB3" },
  { key: "sleep", label: "수면 영향", color: "#6B7F2E" },
];
function chart(days, diary) {
  const last = days.slice(-56);
  const W = 720, H = 240, L = 34, R = 16, T = 16, B = 34, iw = W - L - R, ih = H - T - B;
  const x = (i) => L + (last.length === 1 ? iw / 2 : (i / (last.length - 1)) * iw), y = (v) => T + ih - (v / 10) * ih;
  const grid = [0, 5, 10].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#DBD7CB"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#7C7A73">${v}</text>`).join("");
  const step = Math.max(1, Math.ceil(last.length / 7));
  const xl = last.map((k, i) => (i % step === 0 || i === last.length - 1) ? `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#7C7A73">${k.slice(5).replace("-", "/")}</text>` : "").join("");
  const lines = SERIES.map((s) => `<polyline points="${last.map((k, i) => `${x(i).toFixed(1)},${y(diary[k][s.key] ?? 0).toFixed(1)}`).join(" ")}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>` +
    last.map((k, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(diary[k][s.key] ?? 0).toFixed(1)}" r="3" fill="${s.color}" stroke="#FCFBF8" stroke-width="2"><title>${k} ${s.label} ${diary[k][s.key]}</title></circle>`).join("")).join("");
  return `<div class="chart-wrap"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${grid}${xl}${lines}</svg></div><div class="legend">${SERIES.map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join("")}</div>`;
}
function avg(arr) { arr = arr.filter((v) => v != null); return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "-"; }

function renderPatient(main, [id]) {
  const r = db.patients[id];
  if (!r) { location.hash = "#/patients"; return; }
  const ex = Transfer.expand(r.compact);
  const days = Object.keys(ex.diary).sort();
  const scored = days.filter((k) => ex.diary[k].tinnitus != null);
  const last14 = days.slice(-14), prev14 = days.slice(-28, -14);
  const thi = P.questionnaires.THI;
  const modTitle = Object.fromEntries(P.modules.map((m) => [m.id, m]));
  const week = ex.startDate ? Math.min(8, Math.floor((Date.now() - new Date(ex.startDate + "T00:00:00")) / 86400000 / 7) + 1) : "-";
  const doneByWeek = P.weeks.map((w) => { const ms = P.modules.filter((m) => m.week === w.week); return `${w.week}주 ${ms.filter((m) => ex.done.includes(m.id)).length}/${ms.length}`; }).join(" · ");
  const soundTotal = ex.sounds.reduce((a, s) => a + s.daySec + s.nightSec, 0);
  const soundDays = ex.sounds.length;
  const tp = { baseline: "시작", week8: "종료" };
  main.innerHTML = `
    <section class="hero" style="padding-bottom:12px">
      <div class="eyebrow">번호 ${esc(id)} · 받음 ${fmtDT(r.receivedAt)} · 이전 수신 ${r.history.length - 1}회</div>
      <h1>${esc(ex.nickname || "(이름 없음)")}</h1>
      <p class="lead">시작일 ${ex.startDate || "-"} · ${week}주차 · 환자 앱 기준 내보낸 시각 ${fmtDT(ex.receivedAt)}</p>
      <div class="btn-row no-print"><button class="btn ghost" id="p-print" type="button">인쇄 / PDF</button><button class="btn ghost" id="p-export" type="button">이 환자 JSON</button><button class="btn link" id="p-del" type="button" style="color:var(--accent-ink)">삭제</button></div>
    </section>

    <div class="stat-row">
      <div class="card"><div class="eyebrow">일기 일수</div><div class="stat">${days.length}<small>일</small></div></div>
      <div class="card"><div class="eyebrow">최근 2주 이명 크기</div><div class="stat">${avg(last14.map((k) => ex.diary[k].tinnitus))}<small>${prev14.length ? " (전 2주 " + avg(prev14.map((k) => ex.diary[k].tinnitus)) + ")" : ""}</small></div></div>
      <div class="card"><div class="eyebrow">최근 2주 신경 쓰임</div><div class="stat">${avg(last14.map((k) => ex.diary[k].annoyance))}<small>${prev14.length ? " (전 2주 " + avg(prev14.map((k) => ex.diary[k].annoyance)) + ")" : ""}</small></div></div>
      <div class="card"><div class="eyebrow">최근 2주 수면 영향</div><div class="stat">${avg(last14.map((k) => ex.diary[k].sleep))}</div></div>
      <div class="card"><div class="eyebrow">소리 치료</div><div class="stat">${fmtDur(soundTotal)}</div><div class="muted small">${soundDays}일 사용</div></div>
    </div>

    <section class="section"><div class="section-head"><h2>THI</h2></div>
      <div class="card">${ex.questionnaires.length ? `<div class="result-compare">${ex.questionnaires.map((q) => `<div class="card"><div class="eyebrow">${tp[q.timepoint] || q.timepoint} 평가</div><div class="stat">${q.total}<small>/100</small></div><span class="pill">${esc(thi.severity_labels[q.severity] || q.severity)}</span><p class="muted small" style="margin-top:6px">${fmtDT(q.at)}</p></div>`).join("")}</div>` : `<p class="muted" style="margin:0">제출한 설문이 없습니다.</p>`}</div></section>

    <section class="section"><div class="section-head"><h2>진행</h2></div><div class="card"><p style="margin:0">${doneByWeek}</p></div></section>

    <section class="section"><div class="section-head"><h2>일기 추이</h2></div>
      <div class="card">${scored.length >= 2 ? chart(scored, ex.diary) : `<p class="muted" style="margin:0">일기가 2일 미만입니다.</p>`}</div>
      ${days.length ? `<div class="card"><div class="table-wrap"><table><thead><tr><th>날짜</th><th>크기</th><th>신경</th><th>수면</th><th>실습</th><th>트리거 · 메모</th></tr></thead><tbody>
        ${days.slice().reverse().map((k) => { const d = ex.diary[k]; return `<tr><td>${k.slice(2)}</td><td class="num">${d.tinnitus ?? "-"}</td><td class="num">${d.annoyance ?? "-"}</td><td class="num">${d.sleep ?? "-"}</td><td>${[d.mindfulness ? "마음챙김" : "", d.pmr ? "PMR" : ""].filter(Boolean).join(", ")}</td><td class="small">${esc([d.trigger, d.memo].filter(Boolean).join(" · "))}</td></tr>`; }).join("")}
      </tbody></table></div></div>` : ""}
    </section>

    <section class="section"><div class="section-head"><h2>워크시트</h2></div>
      ${Object.entries(ex.worksheets).map(([mid, w]) => {
        const m = modTitle[mid]; const fields = m ? m.screens.filter((s) => s.type === "worksheet").flatMap((s) => s.fields) : [];
        const lab = (k) => fields.find((f) => f.key === k)?.label || k;
        const single = Object.keys(w.single).length ? `<div class="entry">${Object.entries(w.single).map(([k, v]) => `<p><span class="q">${esc(lab(k))}</span>${esc(v)}</p>`).join("")}</div>` : "";
        const entries = w.entries.slice().reverse().map((en) => `<div class="entry"><div class="when">${fmtDT(en.at)}</div>${Object.entries(en.responses).map(([k, v]) => `<p><span class="q">${esc(lab(k))}</span>${esc(v)}</p>`).join("")}</div>`).join("");
        return `<div class="card"><h3>${esc(m ? m.title : mid)}</h3>${single}${entries}</div>`;
      }).join("") || `<div class="card"><p class="muted" style="margin:0">작성한 워크시트가 없습니다.</p></div>`}
    </section>

    <section class="section"><div class="section-head"><h2>소리 치료 사용 (일별)</h2></div>
      <div class="card">${ex.sounds.length ? `<div class="table-wrap"><table><thead><tr><th>날짜</th><th>주간</th><th>야간</th><th>소리</th></tr></thead><tbody>${ex.sounds.slice().reverse().slice(0, 60).map((s) => `<tr><td>${s.day.slice(2)}</td><td>${fmtDur(s.daySec)}</td><td>${fmtDur(s.nightSec)}</td><td class="small">${esc(Object.entries(s.byTitle).map(([t, sec]) => `${t} ${fmtDur(sec)}`).join(", "))}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted" style="margin:0">사용 기록이 없습니다.</p>`}</div></section>

    <section class="section"><div class="section-head"><h2>진료 메모</h2></div>
      <div class="card"><textarea id="p-note" rows="4" placeholder="이 태블릿에만 저장되는 메모입니다.">${esc(db.notes[id] || "")}</textarea><div class="btn-row"><button class="btn" id="p-note-save" type="button">메모 저장</button></div></div></section>`;
  $("#p-print").onclick = () => window.print();
  $("#p-export").onclick = () => download(`이명기록_${ex.nickname || id}_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ clinicExport: 1, id, ...r, note: db.notes[id] || "" }, null, 2));
  $("#p-del").onclick = () => { if (!confirm("이 환자의 기록을 이 태블릿에서 삭제할까요?")) return; delete db.patients[id]; delete db.notes[id]; save(); location.hash = "#/patients"; toast("삭제했습니다."); };
  $("#p-note-save").onclick = () => { db.notes[id] = $("#p-note").value; save(); toast("메모를 저장했습니다 ✓"); };
}

function download(name, text) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------- 백업 / 가져오기 ----------
function renderData(main) {
  main.innerHTML = `
    <section class="hero" style="padding-bottom:12px"><div class="eyebrow">진료실</div><h1>백업과 가져오기</h1>
      <p class="lead">받은 기록은 이 태블릿의 브라우저에만 있습니다. 정기적으로 전체 백업 파일을 내려받아 안전한 곳에 보관하세요.</p></section>
    <div class="card"><h3>전체 백업</h3><p class="muted">모든 환자 기록과 진료 메모를 하나의 JSON 파일로 내려받습니다.</p>
      <div class="btn-row"><button class="btn" id="d-export" type="button">백업 파일 내려받기</button></div></div>
    <div class="card"><h3>파일 가져오기</h3><p class="muted">환자가 앱에서 내보낸 파일, 이 페이지의 환자 JSON, 전체 백업 파일 모두 가져올 수 있습니다. 같은 번호의 환자는 최신 내용으로 바뀝니다.</p>
      <div class="btn-row"><button class="btn ghost" id="d-import" type="button">파일 선택</button><input type="file" id="d-file" accept="application/json,.json" multiple hidden></div></div>
    <div class="card"><h3>붙여넣기로 받기</h3><p class="muted">QR 조각 문자열을 직접 붙여넣어 시험할 수 있습니다 (개발·점검용).</p>
      <textarea id="d-paste" rows="3" placeholder="T1|...."></textarea><div class="btn-row"><button class="btn ghost" id="d-paste-btn" type="button">조각 추가</button><span id="d-paste-st" class="muted"></span></div></div>`;
  $("#d-export").onclick = () => download(`이명클리닉_백업_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ clinicBackup: 1, ...db }, null, 2));
  $("#d-import").onclick = () => $("#d-file").click();
  $("#d-file").onchange = async (e) => {
    let n = 0;
    for (const f of e.target.files) {
      try {
        const data = JSON.parse(await f.text());
        if (data.clinicBackup) { Object.assign(db.patients, data.patients || {}); Object.assign(db.notes, data.notes || {}); n += Object.keys(data.patients || {}).length; }
        else if (data.clinicExport) { db.patients[data.id] = { compact: data.compact, receivedAt: data.receivedAt, history: data.history || [] }; if (data.note) db.notes[data.id] = data.note; n++; }
        else if (data.profile) { storeRecord(Transfer.compact(data)); n++; } // 환자 앱 내보내기 파일
        else throw new Error();
      } catch (err) { toast(`${f.name}: 읽을 수 없는 파일입니다.`); }
    }
    save(); if (n) { toast(`${n}명의 기록을 가져왔습니다 ✓`); location.hash = "#/patients"; }
  };
  const col = Transfer.collector();
  $("#d-paste-btn").onclick = async () => {
    const st = col.add($("#d-paste").value); $("#d-paste").value = "";
    if (!st) return ($("#d-paste-st").textContent = "형식이 맞지 않습니다");
    $("#d-paste-st").textContent = `조각 ${st.got}/${st.n}`;
    if (st.complete) { const id = storeRecord(await col.result()); toast("저장했습니다 ✓"); location.hash = `#/patient/${id}`; }
  };
}
