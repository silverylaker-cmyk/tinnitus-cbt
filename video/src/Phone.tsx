import React, { useLayoutEffect, useRef, useState } from "react";
import { Img, continueRender, delayRender, staticFile } from "remotion";
import { parseBody } from "./lib/sentences.js";
import "../../illustrations.js";

const ART = (window as any).ART;
const KIND_LABEL: Record<string, string> = { learn: "학습", write: "작성", homework: "숙제", assess: "확인", summary: "정리" };
const EXTRAS: Record<string, string> = { "week1_psychoeducation:1": "cycle", "week3_training:0": "breath", "week5_training:1": "pmr", "week6_psychoeducation:1": "breath-cue", "week7_psychoeducation:2": "img:night" };
const ASSET = (p: string) => staticFile(p);

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

export const Phone: React.FC<{ program: any; mod: any; index: number; view?: "module" | "program"; vstate?: any; st: PhoneState; selectors: string[]; onLayout: (l: Layout) => void }> = ({ program, mod, index, view = "module", vstate, st, selectors, onLayout }) => {
  const screen = mod.screens[index];
  const isLast = index === mod.screens.length - 1;
  const { blocks } = parseBody(screen.title, screen.body);
  const pageRef = useRef<HTMLDivElement>(null);
  const [handle] = useState(() => delayRender("phone layout " + mod.id + "/" + index));
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

  const showArt = index === 0 && mod.kind !== "write" && screen.type === "text";
  const extra = EXTRAS[`${mod.id}:${index}`];
  const entries: any[] = vstate?.entries ?? [];
  const nextLabel = vstate?.afterSave ? "다음으로 ›" : screen.button || (isLast ? "완료" : "다음");
  const tapCls = (sel: string) => (st.tapped === sel ? " tapped" : "");
  const steps = mod.screens.map((_: any, i: number) => <i key={i} className={i <= index ? "on" : ""} />);
  const q = screen.type === "questionnaire" ? program.questionnaires[screen.questionnaire_type] : null;

  let extraHtml = "";
  if (extra === "cycle") { const steps = (screen.body.match(/^\d+\. .+$/gm) || []).map((l: string) => l.replace(/^\d+\. /, "")); extraHtml = `<h3 class="extra-title">악순환 고리 한눈에 보기</h3>` + ART.cycle(steps); }
  const conceptImg = extra?.startsWith("img:") ? ART.CONCEPTS[extra.slice(4)] : null;
  const heroImg = showArt && ART.IMAGES[mod.week];
  const artHtml = showArt && !heroImg ? ART.week(mod.week, "screen-art") : "";

  return (
    <div className="phone">
      <header className="topbar">
        <a className="brand"><span className="brand-mark" /><span className="brand-name">이명 관리 프로그램</span></a>
        <button className="font-btn" type="button">가<small>A</small></button>
        <nav className="nav">
          {[["⌂", "홈", "home"], ["▤", "프로그램", "program"], ["✎", "일기", "today"], ["♫", "소리", "sound"], ["≡", "기록", "records"]].map(([ic, t, r]) => <a key={t} data-route={r} className={(t === "프로그램" ? "active" : "") + (st.tapped === `[data-route="${r}"]` ? " tapped" : "")}><span className="nav-icon">{ic}</span><span>{t}</span></a>)}
        </nav>
      </header>
      <div className="phone-scroll">
        <main className="page" ref={pageRef} style={{ transform: `translateY(${-st.scroll}px)` }}>
          {view === "program" ? <ProgramList program={program} week={mod.week} doneUpTo={mod.id} tapped={st.tapped} /> : (
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
              {conceptImg && <figure className="concept"><Img src={ASSET(conceptImg)} /><figcaption>낮은 볼륨의 소리를 켜 두고, 잠을 쫓아가지 않고 기다립니다</figcaption></figure>}
              <div id="fields">
                {screen.type === "worksheet" && (
                  <>
                    <div className="ws-note muted small">{screen.mode === "append" ? "저장을 누르면 아래에 기록이 하나씩 쌓입니다. 쓰다 만 글은 자동으로 보관됩니다." : "저장을 누르면 내용이 보관되고, 언제든 다시 열어 고칠 수 있습니다."}</div>
                    {vstate?.afterSave && <div className="saved-flash">✓ 방금 쓴 내용이 아래 맨 위에 저장되었습니다. 입력칸은 다음 기록을 위해 비워졌습니다.</div>}
                    {screen.fields.map((f: any, i: number) => {
                      const ty = st.typed[f.key];
                      return (
                        <label className={"field" + (st.focusKey === f.key ? " focus" : "")} key={f.key}>
                          <span className="label"><span className="fnum">{i + 1}</span>{f.label}</span>
                          <textarea data-key={f.key} placeholder={f.placeholder || ""} rows={3} value={(ty?.text || "") + (ty?.caret ? "|" : "")} readOnly />
                        </label>
                      );
                    })}
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
                    <div className="card"><p className="muted" style={{ margin: 0 }}>{q.instruction}</p><p className="muted small" style={{ margin: "8px 0 0" }}>답한 내용은 자동으로 보관되어, 중간에 나갔다 와도 이어서 할 수 있습니다.</p></div>
                    <div className="q-progress muted small">0 / {q.items.length} 문항 답함</div>
                    {q.items.slice(0, 6).map((it: any, i: number) => (
                      <div className="q-item" key={it.key}><fieldset>
                        <legend className="q-text"><span className="q-num">{i + 1}</span>{it.text}</legend>
                        <div className={"q-opts" + (i === 0 ? tapCls(".q-item .q-opts") : "")}>{q.options.map((o: any) => <label key={o.value}><input type="radio" readOnly checked={i === 0 && st.tapped === ".q-item .q-opts" && o.value === 2} /><span>{o.label}</span></label>)}</div>
                      </fieldset></div>
                    ))}
                    <p className="muted small">… (이하 {q.items.length - 6}문항)</p>
                  </>
                )}
              </div>
              <div className="btn-row between sticky-actions">
                {index > 0 ? <a className="btn ghost"><span>‹</span> 이전</a> : <a className="btn ghost">목록</a>}
                <button className={"btn accent big" + tapCls("#next-btn")} id="next-btn" type="button">{nextLabel}{isLast || screen.type !== "text" ? "" : " ›"}</button>
              </div>
            </article>
          </div>)}
        </main>
      </div>
    </div>
  );
};


// 프로그램 목록 화면 (앱의 renderProgram / renderModuleList 와 같은 마크업, 해당 주차만 펼침)
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
