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
  A.week = (n, cls = "") => `<svg class="art ${cls}" viewBox="0 0 200 140" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${WEEK_ART[n] || WEEK_ART[1]}</svg>`;

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
      <svg viewBox="0 0 320 300" aria-label="이명 악순환 고리">
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
        <div class="breath-info"><span class="breath-phase">시작을 누르면 원이 커졌다 작아집니다</span><span class="breath-left"></span></div>
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
      word.textContent = inhale ? "들이쉬기" : (cue || "내쉬기");
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
  A.mountPMR = function (el, parts, opts = {}) {
    const TENSE = opts.tense || 7, RELAX = opts.relax || 12;
    el.innerHTML = `
      <div class="pmr">
        <div class="pmr-head"><span class="pmr-step">전신 ${parts.length}부위</span><span class="pmr-count"></span></div>
        <div class="pmr-part">시작을 누르면 한 부위씩 안내합니다</div>
        <div class="pmr-how">긴장 ${TENSE}초 → 이완 ${RELAX}초. 아프지 않을 정도(70~80% 힘)로만 조입니다.</div>
        <div class="pmr-bar"><i></i></div>
        <div class="btn-row center">
          <button class="btn accent pmr-start" type="button">시작</button>
          <button class="btn ghost pmr-next" type="button" hidden>다음 부위</button>
          <button class="btn ghost pmr-stop" type="button" hidden>멈추기</button>
        </div>
      </div>`;
    const stepEl = el.querySelector(".pmr-step"), countEl = el.querySelector(".pmr-count"), partEl = el.querySelector(".pmr-part"), howEl = el.querySelector(".pmr-how"), bar = el.querySelector(".pmr-bar i");
    const start = el.querySelector(".pmr-start"), next = el.querySelector(".pmr-next"), stop = el.querySelector(".pmr-stop");
    let idx = 0, phaseStart = 0, tense = true, timer = null;
    function show() {
      const p = parts[idx];
      stepEl.textContent = `${idx + 1} / ${parts.length}`;
      partEl.innerHTML = `<b>${p.name}</b><span>${p.how}</span>`;
      el.querySelector(".pmr").classList.toggle("tense", tense);
      howEl.textContent = tense ? "숨을 들이쉬며 힘껏 조입니다" : "'후—' 하고 내쉬며 한 번에 힘을 풉니다. 풀린 느낌을 음미하세요";
    }
    function tick() {
      const dur = tense ? TENSE : RELAX, t = (Date.now() - phaseStart) / 1000;
      countEl.textContent = `${tense ? "긴장" : "이완"} ${Math.max(0, Math.ceil(dur - t))}`;
      bar.style.width = `${Math.min(100, (t / dur) * 100)}%`;
      if (t >= dur) {
        if (tense) { tense = false; phaseStart = Date.now(); show(); }
        else if (idx < parts.length - 1) { idx++; tense = true; phaseStart = Date.now(); show(); }
        else finish(true);
      }
    }
    function finish(done) {
      clearInterval(timer); timer = null;
      el.querySelector(".pmr").classList.remove("tense");
      countEl.textContent = ""; bar.style.width = "0%";
      partEl.innerHTML = done ? "<b>모든 부위를 마쳤습니다</b><span>1~2분간 천천히 복식호흡을 하며 전신이 무겁고 따뜻해진 느낌을 그대로 느껴보세요. 일어날 때는 천천히.</span>" : "시작을 누르면 한 부위씩 안내합니다";
      howEl.textContent = done ? "오늘 일기에 '근육이완' 체크가 자동으로 표시되었습니다. 메모란에 전후 긴장도를 적고 저장해 주세요." : `긴장 ${TENSE}초 → 이완 ${RELAX}초.`;
      stepEl.textContent = `전신 ${parts.length}부위`;
      start.hidden = false; next.hidden = true; stop.hidden = true;
      if (done && opts.onDone) opts.onDone();
    }
    start.onclick = () => { idx = 0; tense = true; phaseStart = Date.now(); start.hidden = true; next.hidden = false; stop.hidden = false; show(); tick(); timer = setInterval(tick, 200); };
    next.onclick = () => { if (idx < parts.length - 1) { idx++; tense = true; phaseStart = Date.now(); show(); } else finish(true); };
    stop.onclick = () => finish(false);
    return () => clearInterval(timer);
  };

  // 주차 5 원고의 14부위 (원고 텍스트에서 파싱)
  A.parsePMRParts = function (body) {
    return (body || "").split("\n").map((l) => /^(\d+)\. (.+?) — (.+)$/.exec(l.trim())).filter(Boolean).map((m) => ({ name: m[2], how: m[3] }));
  };

  root.ART = A;
})(window);
