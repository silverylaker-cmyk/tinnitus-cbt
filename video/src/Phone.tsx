import React, { useLayoutEffect, useRef, useState } from "react";
import { Img, continueRender, delayRender, staticFile } from "remotion";
import { parseBody } from "./lib/sentences.js";
import type { View } from "./lib/timeline";
import "../../illustrations.js";
import "../../data/sounds.js";

const ART = (window as any).ART;
const SOUNDS = (window as any).SOUNDS;
const KIND_LABEL: Record<string, string> = { learn: "학습", write: "작성", homework: "숙제", assess: "확인", summary: "정리" };
// app.js 의 EXTRAS 와 같게 유지
const EXTRAS: Record<string, string> = {
  "week1_psychoeducation:1": "cycle", "week3_training:0": "breath", "week5_training:1": "pmr", "week6_psychoeducation:1": "breath-cue", "week7_psychoeducation:2": "img:night",
  "week1_worksheet:0": "img:cycle", "week1_homework:0": "img:diary", "week2_psychoeducation:2": "img:thought-record",
  "week7_psychoeducation:1": "img:sleep-hygiene", "week8_psychoeducation:0": "img:toolbox", "week8_psychoeducation:1": "img:wave",
};
const ASSET = (p: string) => staticFile(p);
const NAV: [string, string, string][] = [["⌂", "홈", "home"], ["▤", "프로그램", "program"], ["✎", "일기", "today"], ["♫", "소리", "sound"], ["≡", "기록", "records"]];
const ACTIVE_ROUTE: Record<string, string> = { module: "program", program: "program", today: "today", records: "records", sound: "sound" };
const example = (ph: string) => (ph || "").replace(/^예\s*:\s*/, "").split(/,\s*(?=[^)]*(?:\(|$))/)[0].replace(/^["“]|["”]$/g, "");

export type Layout = { sentences: Record<number, { top: number; height: number }>; targets: Record<string, { top: number; left: number; width: number; height: number; fixed?: boolean }>; pageHeight: number };
export type PhoneState = {
  highlight: number | null; done: Set<number>; dim: boolean;
  typed: Record<string, { text: string; caret: boolean }>; focusKey: string | null;
  tapped: string | null; scroll: number;
};

const Sent: React.FC<{ s: number; text: string; st: PhoneState }> = ({ s, text, st }) => (
  <span className={"nar" + (st.highlight === s ? " on" : st.done.has(s) ? " done" : "")} data-s={s}>{text}</span>
);
const Parts: React.FC<{ parts: any[]; st: PhoneState }> = ({ parts, st }) => (
  <>{parts.map((p, i) => p.br ? <br key={i} /> : <React.Fragment key={i}>{i > 0 && !parts[i - 1].br ? " " : ""}<Sent s={p.s} text={p.text} st={st} /></React.Fragment>)}</>
);

function Body({ blocks, st }: { blocks: any[]; st: PhoneState }) {
  return (
    <div className={"body" + (st.dim ? " dim" : "")}>
      {blocks.map((b, i) => {
        if (b.type === "p") return <p key={i}><Parts parts={b.parts} st={st} /></p>;
        if (b.type === "quote") return <blockquote key={i}><Parts parts={b.parts} st={st} /></blockquote>;
        if (b.type === "lead") return <strong className="lead" key={i}><Parts parts={b.parts} st={st} /></strong>;
        const Tag = b.type as "ul" | "ol";
        return <Tag key={i}>{b.items.map((it: any[], j: number) => <li key={j}><Parts parts={it} st={st} /></li>)}</Tag>;
      })}
    </div>
  );
}

export const Phone: React.FC<{ program: any; mod: any; index: number; view?: View; vstate?: any; st: PhoneState; selectors: string[]; onLayout: (l: Layout) => void }> = ({ program, mod, index, view = "module", vstate, st, selectors, onLayout }) => {
  const screen = mod.screens[index];
  const isLast = index === mod.screens.length - 1;
  const { blocks } = parseBody(screen.title, screen.body);
  const pageRef = useRef<HTMLDivElement>(null);
  const [handle] = useState(() => delayRender("phone layout " + mod.id + "/" + index + "/" + view));
  const measured = useRef(false);

  useLayoutEffect(() => {
    if (measured.current) return;
    const run = () => {
      const page = pageRef.current!;
      const base = page.getBoundingClientRect();
      const scale = base.width / page.offsetWidth; // 부모 transform 보정
      const rel = (el: Element) => { const r = el.getBoundingClientRect(); return { top: (r.top - base.top) / scale, left: (r.left - base.left) / scale, width: r.width / scale, height: r.height / scale }; };
      const sentences: Layout["sentences"] = {};
      page.querySelectorAll<HTMLElement>("[data-s]").forEach((el) => { const r = rel(el); sentences[Number(el.dataset.s)] = { top: r.top, height: r.height }; });
      const targets: Layout["targets"] = {};
      const phone = page.closest(".phone")!; const pr = phone.getBoundingClientRect();
      for (const sel of selectors) {
        const el = page.querySelector(sel);
        if (el) { targets[sel] = rel(el); continue; }
        const fx = phone.querySelector(sel); // 페이지 밖(탭바 등) 요소: 폰 기준 좌표, 스크롤 영향 없음
        if (fx) { const r = fx.getBoundingClientRect(); targets[sel] = { top: (r.top - pr.top) / scale, left: (r.left - pr.left) / scale, width: r.width / scale, height: r.height / scale, fixed: true }; }
      }
      measured.current = true;
      onLayout({ sentences, targets, pageHeight: page.offsetHeight });
      continueRender(handle);
    };
    const imgs = Array.from(pageRef.current?.querySelectorAll("img") ?? []).map((im) => im.complete && im.naturalWidth > 0 ? Promise.resolve() : new Promise<void>((r) => { im.addEventListener("load", () => r(), { once: true }); im.addEventListener("error", () => r(), { once: true }); setTimeout(r, 8000); }));
    Promise.all([(document as any).fonts?.ready ?? Promise.resolve(), ...imgs]).then(run);
  }, []);

  const tapCls = (sel: string) => (st.tapped === sel ? " tapped" : "");
  const active = ACTIVE_ROUTE[view] || "program";

  return (
    <div className="phone">
      <header className="topbar">
        <a className="brand"><span className="brand-mark" /><span className="brand-name">이명 관리 프로그램</span></a>
        <button className="font-btn" type="button">가<small>A</small></button>
        <nav className="nav">
          {NAV.map(([ic, t, r]) => <a key={t} data-route={r} className={(r === active ? "active" : "") + (st.tapped === `[data-route="${r}"]` ? " tapped" : "")}><span className="nav-icon">{ic}</span><span>{t}</span></a>)}
        </nav>
      </header>
      <div className="phone-scroll">
        <main className="page" ref={pageRef} style={{ transform: `translateY(${-st.scroll}px)` }}>
          {view === "program" ? <ProgramList program={program} week={mod.week} doneUpTo={mod.id} tapped={st.tapped} />
            : view === "today" ? <TodayView vstate={vstate} st={st} tapCls={tapCls} />
            : view === "records" ? <RecordsView program={program} vstate={vstate} tapCls={tapCls} />
            : view === "sound" ? <SoundView vstate={vstate} tapCls={tapCls} />
            : <ModuleView program={program} mod={mod} index={index} screen={screen} isLast={isLast} blocks={blocks} vstate={vstate} st={st} tapCls={tapCls} />}
        </main>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 모듈 화면
const ModuleView: React.FC<{ program: any; mod: any; index: number; screen: any; isLast: boolean; blocks: any[]; vstate: any; st: PhoneState; tapCls: (s: string) => string }> = ({ program, mod, index, screen, isLast, blocks, vstate, st, tapCls }) => {
  const showArt = index === 0 && mod.kind !== "write" && screen.type === "text";
  const extra = EXTRAS[`${mod.id}:${index}`];
  const entries: any[] = vstate?.entries ?? [];
  const editing: number | null = vstate?.editing ?? null;
  const single: Record<string, string> | null = vstate?.single ?? null;
  const nextLabel = editing != null ? "수정한 내용 저장" : vstate?.afterSave ? "다음으로 ›" : screen.button || (isLast ? "완료" : "다음");
  const steps = mod.screens.map((_: any, i: number) => <i key={i} className={i <= index ? "on" : ""} />);
  const q = screen.type === "questionnaire" ? program.questionnaires[screen.questionnaire_type] : null;

  let extraHtml = "";
  if (extra === "cycle") { const steps = (screen.body.match(/^\d+\. .+$/gm) || []).map((l: string) => l.replace(/^\d+\. /, "")); extraHtml = `<h3 class="extra-title">악순환 고리 한눈에 보기</h3>` + ART.cycle(steps); }
  const conceptKey = extra?.startsWith("img:") ? extra.slice(4) : null;
  const conceptImg = conceptKey ? ART.CONCEPTS[conceptKey] : null;
  const heroImg = showArt && ART.IMAGES[mod.week];
  const artHtml = showArt && !heroImg ? ART.week(mod.week, "screen-art") : "";
  const fieldValue = (f: any) => {
    const ty = st.typed[f.key];
    if (ty) return (ty.text || "") + (ty.caret ? "|" : "");
    if (single && single[f.key]) return single[f.key];
    if (editing != null && entries[editing]?.responses?.[f.key]) return entries[editing].responses[f.key];
    return "";
  };

  return (
    <div className="viewer">
      <div className="viewer-top">
        <a className="back"><span>‹</span> 목록</a>
        <span>{mod.week}주차 · {KIND_LABEL[mod.kind]} · {index + 1}/{mod.screens.length}</span>
        <span className="steps">{steps}</span>
      </div>
      <article className="screen">
        {heroImg && <Img className="art img screen-art" src={ASSET(heroImg)} />}
        {artHtml && <div dangerouslySetInnerHTML={{ __html: artHtml }} />}
        {screen.title.replace(/\s/g, "") !== mod.title.replace(/\s/g, "") && <div className="eyebrow">{mod.title}</div>}
        <h1><Sent s={0} text={screen.title} st={st} /></h1>
        <div className="tts"><button className={"btn ghost sm" + tapCls("#tts-btn")} id="tts-btn" type="button">🔈 소리로 듣기</button></div>
        <Body blocks={blocks} st={st} />
        {extraHtml && <div id="extra" dangerouslySetInnerHTML={{ __html: extraHtml }} />}
        {conceptImg && <div id="extra"><figure className="concept"><Img src={ASSET(conceptImg)} /><figcaption>{ART.CAPTIONS?.[conceptKey!] || ""}</figcaption></figure></div>}
        <div id="fields">
          {screen.type === "worksheet" && (
            <>
              <div className="ws-note muted small">{screen.mode === "append" ? "저장을 누르면 아래에 기록이 하나씩 쌓입니다. 쓰다 만 글은 자동으로 보관됩니다." : "저장을 누르면 내용이 보관되고, 언제든 다시 열어 고칠 수 있습니다."}</div>
              {vstate?.afterSave && <div className="saved-flash">✓ 방금 쓴 내용이 아래 맨 위에 저장되었습니다. 입력칸은 다음 기록을 위해 비워졌습니다.</div>}
              {editing != null && <div className="notice" id="edit-bar">{editing + 1}번째 기록을 고치는 중입니다. 아래 칸을 고친 뒤 '수정한 내용 저장'을 누르세요.</div>}
              {screen.fields.map((f: any, i: number) => (
                <label className={"field" + (st.focusKey === f.key ? " focus" : "")} key={f.key}>
                  <span className="label"><span className="fnum">{i + 1}</span>{f.label}</span>
                  <textarea data-key={f.key} placeholder={f.placeholder || ""} rows={3} value={fieldValue(f)} readOnly />
                </label>
              ))}
              {single && vstate?.savedAt && <p className="status-line" id="single-saved">저장됨 · {vstate.savedAt} 오후 9:12</p>}
              {entries.length > 0 && (
                <div className="entries" id="entries">
                  <h3>지금까지 쓴 기록 <span className="muted">({entries.length}건)</span></h3>
                  {entries.map((en: any, i: number) => (
                    <div className="entry" key={i}>
                      <div className="when">{entries.length - i}번째 · {en.when || "오늘"}</div>
                      {screen.fields.filter((f: any) => en.responses?.[f.key]).map((f: any) => <p key={f.key}><span className="q">{f.label}</span>{en.responses[f.key]}</p>)}
                      <div className="tools"><button className={"btn ghost sm" + (st.tapped === "[data-edit]" && i === 0 ? " tapped" : "")} data-edit={i === 0 ? "1" : undefined} type="button">수정</button><button className="btn link sm" type="button">삭제</button></div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {q && (
            <>
              <div className="card"><p className="muted" style={{ margin: 0 }}>{q.instruction}</p></div>
              {q.items.slice(0, 6).map((it: any, i: number) => (
                <div className="q-item" key={it.key}><fieldset>
                  <legend className="q-text"><span className="q-num">{i + 1}</span>{it.text}</legend>
                  <div className="q-opts">{q.options.map((o: any) => <label key={o.value}><input type="radio" readOnly /><span>{o.label}</span></label>)}</div>
                </fieldset></div>
              ))}
            </>
          )}
        </div>
        <div className="btn-row between sticky-actions">
          {index > 0 ? <a className="btn ghost"><span>‹</span> 이전</a> : <a className="btn ghost">목록</a>}
          <button className={"btn accent big" + tapCls("#next-btn")} id="next-btn" type="button">{nextLabel}{isLast || screen.type !== "text" ? "" : " ›"}</button>
        </div>
      </article>
    </div>
  );
};

// ---------------------------------------------------------------- 프로그램 목록 (앱의 renderProgram 과 같은 마크업, 해당 주차만 펼침)
const ProgramList: React.FC<{ program: any; week: number; doneUpTo: string; tapped: string | null }> = ({ program, week, doneUpTo, tapped }) => {
  const mods = program.modules.filter((m: any) => m.week === week);
  const doneIdx = mods.findIndex((m: any) => m.id === doneUpTo);
  const wk = program.weeks.find((w: any) => w.week === week);
  return (
    <>
      <section className="hero" style={{ paddingBottom: 20 }}>
        <div className="eyebrow">8주 프로그램</div>
        <h1>프로그램 목록</h1>
        <p className="lead">지금은 {week}주차입니다. 다음 주차는 7일마다 자동으로 열립니다.</p>
      </section>
      <div className="week">
        <h3><button className="week-head" type="button">
          {ART.IMAGES[week] ? <Img className="art img week-art" src={ASSET(ART.IMAGES[week])} /> : <span dangerouslySetInnerHTML={{ __html: ART.week(week, "week-art") }} />}
          <span className="week-title"><span className="week-num">{week}주차</span><span className="week-h">{wk?.title}</span><span className="sub">{wk?.subtitle}</span></span>
          <span className="week-status">{doneIdx + 1}/{mods.length}</span>
        </button></h3>
        <div className="week-body">
          {mods.map((m: any, i: number) => {
            const done = i <= doneIdx;
            return (
              <a key={m.id} data-mod={m.id} className={"mod" + (done ? " done" : "") + (m.kind === "write" ? " write" : "") + (tapped === `[data-mod="${m.id}"]` ? " tapped" : "")}>
                <span className="dot">{done ? "✓" : ""}</span>
                <span className="t">{m.title}<span className="kind">{KIND_LABEL[m.kind]}{done ? " · 완료" : ""}</span></span>
                <span className="chev">›</span>
              </a>
            );
          })}
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------- 일기 화면 (앱의 renderToday)
const TodayView: React.FC<{ vstate: any; st: PhoneState; tapCls: (s: string) => string }> = ({ vstate, st, tapCls }) => {
  const v = vstate?.values || {};
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  const memo = st.typed["memo"] ? st.typed["memo"].text + (st.typed["memo"].caret ? "|" : "") : (vstate?.memo || "");
  const Slider = ({ id, label, hint, lo, hi }: { id: string; label: string; hint?: string; lo: string; hi: string }) => {
    const val = v[id] ?? null;
    return (
      <div className={"slider" + (val == null ? " unset" : "")} id={`sl-${id}`}>
        <div className="slider-head"><span className="label" style={{ fontWeight: 500 }}>{label}</span><span className="val"><output>{val ?? "–"}</output><small> / 10</small></span></div>
        <div className="scale">{Array.from({ length: 11 }, (_, n) => <button key={n} type="button" className={(val === n ? "on" : "") + tapCls(`#sl-${id} button[data-v="${n}"]`)} data-id={id} data-v={n}>{n}</button>)}</div>
        <div className="ends"><span>0 = {lo}</span><span>10 = {hi}</span></div>
        {hint && <div className="muted small">{hint}</div>}
      </div>
    );
  };
  return (
    <>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="eyebrow">오늘 · {dateStr}</div>
        <h1>오늘의 일기</h1>
        <p className="lead">1분이면 충분합니다. 정확하지 않아도 괜찮으니 지금 느끼는 대로 남겨 주세요.</p>
        <div className="date-nav"><a className="btn ghost sm">‹ 전날</a><span className="pill">오늘</span></div>
      </section>
      <form className="card" id="diary-form">
        <p className="muted" style={{ margin: "0 0 16px" }}>숫자를 눌러 고르세요.</p>
        <Slider id="tinnitus" label="오늘 이명의 크기" lo="거의 안 들림" hi="매우 큼" />
        <Slider id="annoyance" label="오늘 이명이 신경 쓰인 정도" lo="전혀" hi="매우" />
        <Slider id="sleep" label="간밤 수면에 미친 영향" hint="이명이 잠드는 것을 얼마나 방해했나요" lo="전혀" hi="매우" />
        <hr className="divider" />
        <label className={"check" + tapCls("#in-mindfulness")}><input type="checkbox" id="in-mindfulness" checked={!!vstate?.mindfulness} readOnly /> 마음챙김 호흡을 했어요</label>
        <label className={"check" + tapCls("#in-pmr")}><input type="checkbox" id="in-pmr" checked={!!vstate?.pmr} readOnly /> 근육이완을 했어요</label>
        <hr className="divider" />
        <label className="field"><span className="label">이명이 더 심해진 계기 <span className="muted">(선택)</span></span><input type="text" id="in-trigger" value={vstate?.trigger || ""} placeholder="예: 시끄러운 곳, 피로, 커피" readOnly /></label>
        <label className={"field" + (st.focusKey === "memo" ? " focus" : "")}><span className="label">메모 <span className="muted">(선택)</span></span><span className="hint">오늘 느낀 점을 자유롭게. 연습한 것(이완 전후 긴장도, 잠든 시간 등)을 적어 두면 진료 때 도움이 됩니다.</span><textarea id="in-memo" rows={3} value={memo} placeholder="예: 근육이완 20분, 긴장도 7 → 3" readOnly /></label>
        <div className="btn-row between sticky-actions"><a className="btn link">지난 기록 보기</a><button className={"btn accent big" + tapCls("#diary-form button[type=submit]")} type="submit">저장</button></div>
        <p id="diary-status" className="status-line">마지막 저장 오늘 오후 9:12</p>
      </form>
    </>
  );
};

// ---------------------------------------------------------------- 기록 화면 (앱의 renderRecords)
const SERIES = [{ key: "tinnitus", label: "이명 크기", color: "#C2542F" }, { key: "annoyance", label: "신경 쓰인 정도", color: "#2F6FB3" }, { key: "sleep", label: "수면 영향", color: "#6B7F2E" }];
const RecordsView: React.FC<{ program: any; vstate: any; tapCls: (s: string) => string }> = ({ program, vstate, tapCls }) => {
  const diary: any[] = (vstate?.diary || []).slice().reverse(); // 오래된 날 → 오늘
  const wsIds: string[] = vstate?.worksheets || [];
  const W = 520, H = 200, padL = 28, padR = 10, padT = 12, padB = 26;
  const x = (i: number) => padL + (diary.length > 1 ? (i / (diary.length - 1)) * (W - padL - padR) : (W - padL - padR) / 2);
  const y = (v: number) => padT + (1 - v / 10) * (H - padT - padB);
  return (
    <div id="records">
      <section className="hero" style={{ paddingBottom: 16 }}>
        <div className="eyebrow">나의 기록</div>
        <h1>기록</h1>
        <p className="lead">일기, 워크시트, 소리 치료 사용 기록을 한곳에서 봅니다. 날짜나 제목을 누르면 다시 열어 고칠 수 있습니다.</p>
        <div className="btn-row"><a className="btn accent">진료 때 QR로 전달</a><a className="btn ghost">인쇄 / PDF</a></div>
      </section>
      <section className="section">
        <div className="section-head"><h2>일기 추이</h2><a className="more">오늘 일기</a></div>
        <div className="card chart">
          {diary.length >= 2 ? (
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
              {[0, 5, 10].map((g) => <g key={g}><line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="#d9d5cc" strokeWidth={1} /><text x={padL - 6} y={y(g) + 4} fontSize={11} textAnchor="end" fill="#6b6862">{g}</text></g>)}
              {SERIES.map((s) => <polyline key={s.key} fill="none" stroke={s.color} strokeWidth={2.5} points={diary.map((d, i) => `${x(i).toFixed(1)},${y(d[s.key]).toFixed(1)}`).join(" ")} />)}
              {SERIES.map((s) => diary.map((d, i) => <circle key={s.key + i} cx={x(i)} cy={y(d[s.key])} r={3.5} fill={s.color} stroke="#FCFBF8" strokeWidth={2} />))}
              {diary.map((d, i) => <text key={i} x={x(i)} y={H - 8} fontSize={11} textAnchor="middle" fill="#6b6862">{d.date}</text>)}
            </svg>
          ) : <p className="muted" style={{ margin: 0 }}>일기를 이틀 이상 기록하면 추이가 표시됩니다.</p>}
          {diary.length >= 2 && <div className="muted small" style={{ marginTop: 6 }}>{SERIES.map((s) => <span key={s.key} style={{ marginRight: 12 }}><span style={{ display: "inline-block", width: 10, height: 10, background: s.color, borderRadius: 5, marginRight: 4 }} />{s.label}</span>)}</div>}
        </div>
        <div className="card">
          {diary.length ? (
            <div className="table-wrap"><table><thead><tr><th>날짜</th><th>크기</th><th>신경 쓰임</th><th>수면</th><th>실습</th><th>메모</th><th></th></tr></thead><tbody>
              {diary.slice().reverse().map((d, i) => <tr key={i} className="rowlink"><td><a>{d.date}</a></td><td className="num">{d.tinnitus}</td><td className="num">{d.annoyance}</td><td className="num">{d.sleep}</td><td>{[d.mindfulness ? "마음챙김" : "", d.pmr ? "근육이완" : ""].filter(Boolean).join(", ")}</td><td className="small">{d.memo || ""}</td><td><a className="btn ghost sm">고치기</a></td></tr>)}
            </tbody></table></div>
          ) : <p className="muted" style={{ margin: 0 }}>아직 일기가 없습니다.</p>}
        </div>
      </section>
      <section className="section ws">
        <div className="section-head"><h2>워크시트</h2></div>
        {wsIds.length ? wsIds.map((id) => {
          const m = program.modules.find((mm: any) => mm.id === id); if (!m) return null;
          const scr = m.screens.find((s: any) => s.type === "worksheet");
          const fields = scr?.fields || [];
          const rows = fields.map((f: any) => [f.label, example(f.placeholder)]).filter(([, v]: any) => v);
          return (
            <div className="card" key={id}>
              <div className="section-head"><h3>{m.title}</h3><a className={"more" + tapCls("#records .ws a.more")}>열어서 고치기</a></div>
              <div className="entry">{scr?.mode === "append" && <div className="when">오늘 오후 9:12</div>}{rows.map(([l, v]: any) => <p key={l}><span className="q">{l}</span>{v}</p>)}</div>
            </div>
          );
        }) : <div className="card"><p className="muted" style={{ margin: 0 }}>아직 작성한 워크시트가 없습니다.</p></div>}
      </section>
      <section className="section">
        <div className="section-head"><h2>소리 치료 사용</h2><a className="more">사운드</a></div>
        <div className="card"><p className="muted" style={{ margin: 0 }}>최근 30일 사용 기록이 없습니다.</p></div>
      </section>
    </div>
  );
};

// ---------------------------------------------------------------- 소리 화면 (앱의 renderSound)
const SoundView: React.FC<{ vstate: any; tapCls: (s: string) => string }> = ({ vstate, tapCls }) => {
  const S = SOUNDS;
  return (
    <>
      <section className="hero" style={{ paddingBottom: 16 }}>
        <div className="eyebrow">소리 치료</div>
        <h1>소리</h1>
        <p className="lead">{S.note}</p>
      </section>
      <div className="card">
        <div className="player"><div className="empty">아래에서 소리를 골라 누르세요</div></div>
        <div className="kv"><span className="muted">선택된 소리 없음</span><span className="timer">00:00</span></div>
        <p className="muted small" style={{ margin: "8px 0 0" }}>재생을 누르면 사용 시간이 자동으로 기록되고, 밤 10시~아침 6시 사용은 야간으로 구분됩니다.</p>
      </div>
      {S.groups.map((g: any) => (
        <section className="section" key={g.id}>
          <div className="section-head"><h2>{g.title}</h2></div>
          <p className="muted">{g.desc}</p>
          <div className="sound-list">{g.items.map((it: any, i: number) => (
            <button className={"sound-item" + (g.id === S.groups[0].id && i === 0 ? tapCls(".sound-item") : "")} key={it.id} type="button"><span className="st">{it.title}</span><span className="sd">{it.desc || "편안한 배경 소리"}</span></button>
          ))}</div>
        </section>
      ))}
      <section className="section">
        <div className="section-head"><h2>최근 사용 기록</h2><a className="more">전체 보기</a></div>
        <div className="card"><p className="muted" style={{ margin: 0 }}>최근 7일 사용 기록이 없습니다.</p></div>
      </section>
    </>
  );
};
