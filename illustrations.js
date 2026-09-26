/* 그림과 모션 — 인라인 SVG 라인아트, 악순환 고리, 호흡 가이드, 근육이완 타이머
   모든 모션은 prefers-reduced-motion 을 존중 (CSS에서 처리) */
(function (root) {
  "use strict";
  const A = {};
  const INK = "#141413", ACC = "#C2542F", SOFT = "#E8C9B8", LINE = "#C9C5B7";

  // ---------- 주차별 히어로 일러스트 (선이 그려지는 애니메이션은 CSS .draw) ----------
  const WEEK_ART = {
    1: `<circle cx="100" cy="70" r="46" class="draw" stroke="${ACC}"/><circle cx="100" cy="70" r="30" class="draw d2" stroke="${INK}"/><circle cx="100" cy="70" r="14" class="draw d3" stroke="${ACC}"/><path d="M146 70 l10 -8 M146 70 l10 8" class="draw d3" stroke="${ACC}"/>`,
    2: `<path d="M60 90 c-20 0 -25 -28 -4 -32 c2 -22 34 -26 42 -8 c18 -10 40 6 32 24 c14 6 6 26 -8 24 z" class="draw" stroke="${INK}"/><circle cx="52" cy="108" r="5" class="draw d2" stroke="${INK}"/><circle cx="40" cy="120" r="3" class="draw d3" stroke="${INK}"/><path d="M84 66 q8 -10 16 0" class="draw d2" stroke="${ACC}"/><path d="M100 82 q8 6 16 0" class="draw d3" stroke="${ACC}"/>`,
    3: `<path d="M100 22 L52 118 L148 118 Z" class="draw" stroke="${SOFT}" fill="${SOFT}" fill-opacity="0.35"/><circle cx="100" cy="22" r="8" class="draw d2" stroke="${ACC}"/><circle cx="100" cy="100" r="12" class="draw d3" stroke="${INK}"/><path d="M30 60 q10 -8 20 0 M150 60 q10 -8 20 0" class="draw d3" stroke="${LINE}"/>`,
    4: `<path d="M70 30 h60 M84 30 v40 l-30 44 h92 l-30 -44 v-40" class="draw" stroke="${INK}"/><path d="M62 104 q20 -10 40 0 t40 0" class="draw d2" stroke="${ACC}"/><circle cx="92" cy="92" r="3" class="draw d3" stroke="${ACC}"/><circle cx="110" cy="84" r="2.5" class="draw d3" stroke="${ACC}"/>`,
    5: `<path d="M30 70 q20 -30 40 0 t40 0 t40 0 t40 0" class="draw" stroke="${ACC}"/><path d="M30 90 q20 -14 40 0 t40 0 t40 0 t40 0" class="draw d2" stroke="${INK}"/><path d="M30 106 q20 -6 40 0 t40 0 t40 0 t40 0" class="draw d3" stroke="${LINE}"/>`,
    6: `<circle cx="100" cy="72" r="40" class="draw" stroke="${SOFT}" fill="${SOFT}" fill-opacity="0.4"/><circle cx="100" cy="72" r="24" class="draw d2" stroke="${ACC}"/><path d="M62 72 h-24 M162 72 h-24 M100 34 v-20 M100 110 v20" class="draw d3" stroke="${INK}"/>`,
    7: `<path d="M118 30 a34 34 0 1 0 22 60 a28 28 0 0 1 -22 -60 z" class="draw" stroke="${INK}"/><path d="M30 112 q15 -10 30 0 t30 0 t30 0 t30 0 t30 0" class="draw d2" stroke="${ACC}"/><circle cx="46" cy="40" r="2" fill="${ACC}"/><circle cx="66" cy="28" r="1.5" fill="${INK}"/><circle cx="160" cy="46" r="2" fill="${ACC}"/>`,
    8: `<circle cx="100" cy="76" r="30" class="draw" stroke="${ACC}"/><path d="M40 100 c-12 0 -14 -18 -2 -18 c2 -12 22 -14 26 -4 c12 -6 24 6 18 16 c8 4 2 14 -6 12 z" class="draw d2" stroke="${INK}" fill="${INK}" fill-opacity="0.04"/><path d="M100 30 v-14 M138 46 l10 -10 M62 46 l-10 -10" class="draw d3" stroke="${ACC}"/>`,
  };
  // 생성 삽화가 있는 주차는 그림 파일을, 없는 주차는 선화 SVG를 쓴다 (img/ 폴더에 weekN.webp 를 넣고 여기에 등록)
  A.IMAGES = { 1: "img/week1.webp", 2: "img/week2.webp", 3: "img/week3.webp", 4: "img/week4.webp", 5: "img/week5.webp", 6: "img/week6.webp", 7: "img/week7.webp", 8: "img/week8.webp" };
  A.CONCEPTS = {
    night: "img/concept-night.webp", cycle: "img/concept-cycle.webp", diary: "img/concept-diary.webp", "thought-record": "img/concept-thought-record.webp",
    breath: "img/concept-breath.webp", "pmr-body": "img/concept-pmr-body.webp", "three-spots": "img/concept-three-spots.webp",
    "sleep-hygiene": "img/concept-sleep-hygiene.webp", toolbox: "img/concept-toolbox.webp", wave: "img/concept-wave.webp",
  };
  A.CAPTIONS = {
    night: "낮은 볼륨의 소리를 켜 두고, 잠을 쫓아가지 않고 기다립니다",
    cycle: "소리는 그대로인데, 반응이 고리를 만듭니다",
    diary: "하루 1분, 세 가지 점수만 남기면 됩니다",
    "thought-record": "스쳐 가는 생각을 붙잡아 종이에 옮기면, 생각과 나 사이에 거리가 생깁니다",
    breath: "주의는 호흡에, 소리는 그대로 두고",
    "pmr-body": "팔에서 다리까지, 한 부위씩 긴장했다가 풀기",
    "three-spots": "어깨, 턱, 이마 — 긴장이 잘 숨는 세 곳",
    "sleep-hygiene": "같은 시간에 일어나기, 침대는 잠자리로만, 늦은 카페인 피하기, 조명 낮추기",
    toolbox: "상황에 맞는 도구 하나만 꺼내면 됩니다",
    wave: "힘든 날은 파도입니다. 올라갔다가 반드시 내려옵니다",
  };
  A.week = (n, cls = "") => A.IMAGES[n]
    ? `<img class="art img ${cls}" src="${A.IMAGES[n]}" alt="">`
    : `<svg class="art ${cls}" viewBox="0 0 200 140" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${WEEK_ART[n] || WEEK_ART[1]}</svg>`;
  A.concept = (key, caption = "") => A.CONCEPTS[key] ? `<figure class="concept"><img src="${A.CONCEPTS[key]}" alt="${caption}">${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>` : "";

  // 홈 화면 장식 — 천천히 숨 쉬는 동심원
  A.heroRings = () => `<svg class="hero-rings" viewBox="0 0 200 200" fill="none" aria-hidden="true">
    <circle cx="100" cy="100" r="80" stroke="${SOFT}" stroke-width="1.5" class="ring r1"/>
    <circle cx="100" cy="100" r="56" stroke="${ACC}" stroke-width="1.5" class="ring r2"/>
    <circle cx="100" cy="100" r="32" stroke="${INK}" stroke-width="1.5" class="ring r3"/>
    <circle cx="100" cy="100" r="5" fill="${ACC}"/></svg>`;

  // ---------- 악순환 고리 (6단계가 차례로 켜지는 링) ----------
  A.cycle = function (steps) {
    const cx = 160, cy = 150, R = 105;
    const pts = steps.map((_, i) => { const a = -Math.PI / 2 + (i / steps.length) * Math.PI * 2; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
    const nodes = pts.map(([x, y], i) => `<g class="cyc-node" style="--i:${i}"><circle cx="${x}" cy="${y}" r="26" fill="#FCFBF8" stroke="${LINE}" stroke-width="1.5"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="18" font-family="Noto Serif KR, serif" fill="${INK}">${i + 1}</text></g>`).join("");
    const arrows = pts.map(([x, y], i) => { const [nx, ny] = pts[(i + 1) % pts.length]; const dx = nx - x, dy = ny - y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L; return `<line class="cyc-arrow" style="--i:${i}" x1="${x + ux * 30}" y1="${y + uy * 30}" x2="${nx - ux * 32}" y2="${ny - uy * 32}" stroke="${ACC}" stroke-width="2" marker-end="url(#cyc-head)"/>`; }).join("");
    return `<figure class="cycle">
      <svg viewBox="0 0 320 300" role="img" aria-label="이명 악순환 고리">
        <defs><marker id="cyc-head" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="${ACC}"/></marker></defs>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${SOFT}" stroke-width="1" stroke-dasharray="4 6"/>
        ${arrows}${nodes}
        <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="15" fill="${INK}" font-family="Noto Serif KR, serif">악순환</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="15" fill="${INK}" font-family="Noto Serif KR, serif">고리</text>
      </svg>
      <ol class="cycle-legend">${steps.map((s, i) => `<li style="--i:${i}"><b>${i + 1}</b>${s}</li>`).join("")}</ol>
    </figure>`;
  };

  // ---------- 호흡 가이드 ----------
  // opts: { inhale: 4, exhale: 6, minutes: [3,5,10], cue: "편안" }
  A.mountBreath = function (el, opts = {}) {
    const IN = opts.inhale || 4, OUT = opts.exhale || 6, cue = opts.cue || "";
    const mins = opts.minutes || [3, 5, 10];
    el.innerHTML = `
      <div class="breath">
        <div class="breath-stage"><div class="breath-circle"><span class="breath-word">준비</span></div></div>
        <div class="breath-info"><span class="breath-phase">시작을 누르면 원이 커졌다 작아집니다</span><span class="breath-left"></span></div><div class="sr-only" aria-live="polite" data-live></div>
        <div class="btn-row center">
          <label class="pill-select">시간
            <select class="breath-min">${mins.map((m) => `<option value="${m}" ${m === mins[1] ? "selected" : ""}>${m}분</option>`).join("")}</select></label>
          <button class="btn accent breath-start" type="button">시작</button>
          <button class="btn ghost breath-stop" type="button" hidden>멈추기</button>
        </div>
      </div>`;
    const circle = el.querySelector(".breath-circle"), word = el.querySelector(".breath-word"), phase = el.querySelector(".breath-phase"), left = el.querySelector(".breath-left");
    const start = el.querySelector(".breath-start"), stop = el.querySelector(".breath-stop"), sel = el.querySelector(".breath-min");
    let timer = null, endAt = 0, cycleStart = 0;
    function tick() {
      const now = Date.now();
      if (now >= endAt) return finish(true);
      const t = ((now - cycleStart) / 1000) % (IN + OUT);
      const inhale = t < IN;
      circle.style.transform = `scale(${inhale ? 0.6 + 0.4 * (t / IN) : 1 - 0.4 * ((t - IN) / OUT)})`;
      const wt = inhale ? "들이쉬기" : (cue || "내쉬기"); if (word.textContent !== wt) { word.textContent = wt; const lv = el.querySelector("[data-live]"); if (lv) lv.textContent = wt; }
      phase.textContent = inhale ? `코로 천천히 들이쉽니다 (${Math.ceil(IN - t)})` : `길게 내쉽니다 (${Math.ceil(IN + OUT - t)})`;
      const remain = Math.ceil((endAt - now) / 1000);
      left.textContent = `${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")} 남음`;
    }
    function finish(done) {
      clearInterval(timer); timer = null;
      circle.style.transform = "scale(0.6)"; word.textContent = done ? "잘하셨어요" : "준비";
      phase.textContent = done ? "연습을 마쳤습니다. 오늘 일기에 '마음챙김' 체크가 자동으로 표시되었습니다. 일기도 저장해 주세요." : "시작을 누르면 원이 커졌다 작아집니다";
      left.textContent = ""; start.hidden = false; stop.hidden = true; sel.disabled = false;
      if (done && opts.onDone) opts.onDone();
    }
    start.onclick = () => { cycleStart = Date.now(); endAt = cycleStart + Number(sel.value) * 60000; start.hidden = true; stop.hidden = false; sel.disabled = true; circle.classList.add("live"); tick(); timer = setInterval(tick, 100); };
    stop.onclick = () => finish(false);
    return () => clearInterval(timer);
  };

  // ---------- 점진적 근육이완 안내 타이머 ----------
  // parts: [{name, how, relax, reps, move}] — move>0 이면 힘을 주지 않고 move초 동안 움직이는 단계
  A.mountPMR = function (el, parts, opts = {}) {
    const TENSE = opts.tense || 7, RELAX = opts.relax || 15, READY = 5, CLOSE = opts.close || 60;
    // 단계 목록을 미리 펼친다: 준비 → (부위×반복: 긴장 → 이완) → 마무리 호흡
    const steps = [{ kind: "ready", dur: READY }];
    parts.forEach((p, i) => {
      if (p.move) { steps.push({ kind: "move", part: i, dur: p.move }); return; }
      for (let r = 1; r <= p.reps; r++) {
        steps.push({ kind: "tense", part: i, rep: r, dur: TENSE });
        steps.push({ kind: "relax", part: i, rep: r, dur: RELAX });
      }
    });
    steps.push({ kind: "close", dur: CLOSE });
    const total = steps.reduce((s, x) => s + x.dur, 0);
    const mins = Math.round(total / 60);
    el.innerHTML = `
      <div class="pmr">
        <div class="pmr-head"><span class="pmr-step">${parts.length}단계 · 약 ${mins}분</span><span class="pmr-count"></span></div>
        <div class="pmr-part" aria-live="polite">시작을 누르면 한 부위씩 안내합니다</div>
        <div class="pmr-how">긴장 ${TENSE}초 → 이완 ${RELAX}초. 아프지 않을 정도(70~80% 힘)로만 조입니다.</div>
        <div class="pmr-bar"><i></i></div>
        <div class="pmr-total"><i></i></div>
        <label class="check pmr-sound"><input type="checkbox" checked> 바뀔 때 소리로 알림 (눈을 감고 해도 됩니다)</label>
        <div class="btn-row center">
          <button class="btn accent pmr-start" type="button">시작</button>
          <button class="btn ghost pmr-pause" type="button" hidden>잠깐 멈춤</button>
          <button class="btn ghost pmr-next" type="button" hidden>다음 부위</button>
          <button class="btn ghost pmr-stop" type="button" hidden>그만하기</button>
        </div>
      </div>`;
    const box = el.querySelector(".pmr"), stepEl = el.querySelector(".pmr-step"), countEl = el.querySelector(".pmr-count"), partEl = el.querySelector(".pmr-part"), howEl = el.querySelector(".pmr-how");
    const bar = el.querySelector(".pmr-bar i"), totalBar = el.querySelector(".pmr-total i"), soundBox = el.querySelector(".pmr-sound input");
    const start = el.querySelector(".pmr-start"), pause = el.querySelector(".pmr-pause"), next = el.querySelector(".pmr-next"), stop = el.querySelector(".pmr-stop");
    let si = 0, elapsed = 0, last = 0, paused = false, timer = null, actx = null;
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    // 부드러운 알림음 — 긴장은 높은 음, 이완은 낮은 음
    function chime(freq) {
      if (!soundBox.checked) return;
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const o = actx.createOscillator(), g = actx.createGain(), now = actx.currentTime;
        o.type = "sine"; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.18, now + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        o.connect(g); g.connect(actx.destination); o.start(now); o.stop(now + 1.3);
      } catch (e) { /* 소리 없이 계속 */ }
    }
    const before = (i) => steps.slice(0, i).reduce((s, x) => s + x.dur, 0);

    function show() {
      const s = steps[si], p = parts[s.part];
      box.classList.toggle("tense", s.kind === "tense");
      if (s.kind === "ready") {
        stepEl.textContent = "준비";
        partEl.innerHTML = "<b>편안하게 자리를 잡습니다</b><span>눈을 감아도 좋습니다. 천천히 숨을 한두 번 쉬어 봅니다.</span>";
        howEl.textContent = "곧 발부터 시작합니다";
      } else if (s.kind === "close") {
        stepEl.textContent = "마무리";
        partEl.innerHTML = "<b>천천히 호흡합니다</b><span>배가 부풀었다 가라앉는 것을 느끼며, 전신이 무겁고 따뜻해진 느낌을 그대로 느껴봅니다.</span>";
        howEl.textContent = "이명이 들려도 그대로 두고, 호흡으로 돌아옵니다";
      } else {
        const rep = p.reps > 1 && s.rep ? ` · ${s.rep}/${p.reps}회` : "";
        stepEl.textContent = `${s.part + 1} / ${parts.length}${rep}`;
        const text = s.kind === "relax" ? (p.relax || "힘을 풀고 풀린 느낌을 음미합니다") : p.how;
        partEl.innerHTML = `<b>${esc(p.name)}</b><span>${esc(text)}</span>`;
        howEl.textContent = s.kind === "tense" ? "숨을 들이쉬며 힘껏 조입니다 (아프지 않을 만큼)" : s.kind === "relax" ? "'후—' 하고 내쉬며 힘을 풉니다. 풀린 느낌을 음미하세요" : "힘은 주지 않습니다. 편한 만큼만 천천히";
      }
      if (s.kind === "tense") chime(660); else if (s.kind === "relax" || s.kind === "move" || s.kind === "close") chime(440);
    }
    function go(i) { si = i; elapsed = 0; show(); }
    function tick() {
      const now = Date.now();
      if (!paused) elapsed += (now - last) / 1000;
      last = now;
      const s = steps[si];
      const label = { ready: "준비", tense: "긴장", relax: "이완", move: "천천히", close: "호흡" }[s.kind];
      countEl.textContent = `${label} ${Math.max(0, Math.ceil(s.dur - elapsed))}`;
      bar.style.width = `${Math.min(100, (elapsed / s.dur) * 100)}%`;
      totalBar.style.width = `${Math.min(100, ((before(si) + Math.min(elapsed, s.dur)) / total) * 100)}%`;
      if (elapsed >= s.dur) { if (si < steps.length - 1) go(si + 1); else finish(true); }
    }
    function finish(done) {
      clearInterval(timer); timer = null; paused = false;
      box.classList.remove("tense", "paused");
      countEl.textContent = ""; bar.style.width = "0%"; totalBar.style.width = "0%";
      partEl.innerHTML = done ? "<b>근육이완을 마쳤습니다</b><span>일어날 때는 서두르지 말고 천천히 움직이세요. 반복해서 연습할수록 일상에서 더 빨리 풀립니다.</span>" : "시작을 누르면 한 부위씩 안내합니다";
      howEl.textContent = done ? "오늘 일기에 '근육이완' 체크가 자동으로 표시되었습니다. 메모란에 전후 긴장도를 적고 저장해 주세요." : `긴장 ${TENSE}초 → 이완 ${RELAX}초.`;
      stepEl.textContent = `${parts.length}단계 · 약 ${mins}분`;
      start.hidden = false; pause.hidden = true; next.hidden = true; stop.hidden = true;
      if (done) { chime(523); if (opts.onDone) opts.onDone(); }
    }
    start.onclick = () => {
      start.hidden = true; pause.hidden = false; next.hidden = false; stop.hidden = false;
      pause.textContent = "잠깐 멈춤"; paused = false; last = Date.now();
      go(0); tick(); timer = setInterval(tick, 200);
    };
    pause.onclick = () => { paused = !paused; last = Date.now(); box.classList.toggle("paused", paused); pause.textContent = paused ? "이어서 하기" : "잠깐 멈춤"; };
    // 다음 부위: 지금 부위의 남은 반복을 건너뛰고 다음 부위(또는 마무리)의 첫 단계로
    next.onclick = () => {
      const cur = steps[si].part;
      let j = si + 1;
      while (j < steps.length - 1 && cur !== undefined && steps[j].part === cur) j++;
      go(Math.min(j, steps.length - 1)); tick();
    };
    stop.onclick = () => finish(false);
    return () => { clearInterval(timer); if (actx) actx.close().catch(() => {}); };
  };

  // 주차 5 원고의 부위 목록 (원고 텍스트에서 파싱)
  //   "1. 발·종아리 (2회) — 조이는 안내 → 풀기: 푸는 안내"
  //   "6. 고개 돌리기 (힘 주지 않고 20초) — 안내"
  A.parsePMRParts = function (body) {
    return (body || "").split("\n").map((l) => /^(\d+)\. (.+?) — (.+)$/.exec(l.trim())).filter(Boolean).map((m) => {
      let name = m[2], reps = 1, move = 0;
      const r = /\s*\((\d+)회\)$/.exec(name);
      if (r) { reps = Number(r[1]); name = name.slice(0, r.index); }
      const mv = /\s*\(힘 주지 않고 (\d+)초\)$/.exec(name);
      if (mv) { move = Number(mv[1]); name = name.slice(0, mv.index); }
      const [how, relax = ""] = m[3].split(" → 풀기: ");
      return { name, how, relax, reps, move };
    });
  };

  root.ART = A;
})(window);
