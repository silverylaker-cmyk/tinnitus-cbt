import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { parseBody } from "./lib/sentences.js";
import "../../illustrations.js";

const ART = (window as any).ART;
const KIND_LABEL: Record<string, string> = { learn: "학습", write: "작성", homework: "숙제", assess: "확인", summary: "정리" };
const EXTRAS: Record<string, string> = { "week1_psychoeducation:1": "cycle", "week3_training:0": "breath", "week5_training:1": "pmr", "week6_psychoeducation:1": "breath-cue", "week7_psychoeducation:2": "img:night" };
const ASSET = (p: string) => staticFile(p);

export type Layout = { sentences: Record<number, { top: number; height: number }>; targets: Record<string, { top: number; left: number; width: number; height: number }>; pageHeight: number };
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

export const Phone: React.FC<{ program: any; mod: any; index: number; st: PhoneState; selectors: string[]; onLayout: (l: Layout) => void }> = ({ program, mod, index, st, selectors, onLayout }) => {
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
      for (const sel of selectors) { const el = page.querySelector(sel); if (el) targets[sel] = rel(el); }
      measured.current = true;
      onLayout({ sentences, targets, pageHeight: page.offsetHeight });
      continueRender(handle);
    };
    (document as any).fonts?.ready ? (document as any).fonts.ready.then(run) : run();
  }, []);

  const showArt = index === 0 && mod.kind !== "write" && screen.type === "text";
  const extra = EXTRAS[`${mod.id}:${index}`];
  const nextLabel = screen.button || (isLast ? "완료" : "다음");
  const tapCls = (sel: string) => (st.tapped === sel ? " tapped" : "");
  const steps = mod.screens.map((_: any, i: number) => <i key={i} className={i <= index ? "on" : ""} />);
  const q = screen.type === "questionnaire" ? program.questionnaires[screen.questionnaire_type] : null;

  let extraHtml = "";
  if (extra === "cycle") { const steps = (screen.body.match(/^\d+\. .+$/gm) || []).map((l: string) => l.replace(/^\d+\. /, "")); extraHtml = `<h3 class="extra-title">악순환 고리 한눈에 보기</h3>` + ART.cycle(steps); }
  else if (extra?.startsWith("img:")) extraHtml = `<figure class="concept"><img src="${ASSET(ART.CONCEPTS[extra.slice(4)])}" alt=""><figcaption>낮은 볼륨의 소리를 켜 두고, 잠을 쫓아가지 않고 기다립니다</figcaption></figure>`;
  const artHtml = showArt ? (ART.IMAGES[mod.week] ? `<img class="art img screen-art" src="${ASSET(ART.IMAGES[mod.week])}" alt="">` : ART.week(mod.week, "screen-art")) : "";

  return (
    <div className="phone">
      <header className="topbar">
        <a className="brand"><span className="brand-mark" /><span className="brand-name">이명 관리 프로그램</span></a>
        <button className="font-btn" type="button">가<small>A</small></button>
        <nav className="nav">
          {[["⌂", "홈"], ["▤", "프로그램"], ["✎", "일기"], ["♫", "소리"], ["≡", "기록"]].map(([ic, t]) => <a key={t} className={t === "프로그램" ? "active" : ""}><span className="nav-icon">{ic}</span><span>{t}</span></a>)}
        </nav>
      </header>
      <div className="phone-scroll">
        <main className="page" ref={pageRef} style={{ transform: `translateY(${-st.scroll}px)` }}>
          <div className="viewer">
            <div className="viewer-top">
              <a className="back"><span>‹</span> 목록</a>
              <span>{mod.week}주차 · {KIND_LABEL[mod.kind]} · {index + 1}/{mod.screens.length}</span>
              <span className="steps">{steps}</span>
            </div>
            <article className="screen">
              {artHtml && <div dangerouslySetInnerHTML={{ __html: artHtml }} />}
              {screen.title.replace(/\s/g, "") !== mod.title.replace(/\s/g, "") && <div className="eyebrow">{mod.title}</div>}
              <h1><Sent s={0} text={screen.title} st={st} /></h1>
              <div className="tts"><button className="btn ghost sm" type="button">🔈 소리로 듣기</button></div>
              <Body blocks={blocks} st={st} />
              {extraHtml && <div id="extra" dangerouslySetInnerHTML={{ __html: extraHtml }} />}
              <div id="fields">
                {screen.type === "worksheet" && (
                  <>
                    <div className="ws-note muted small">{screen.mode === "append" ? "저장을 누르면 아래에 기록이 하나씩 쌓입니다. 쓰다 만 글은 자동으로 보관됩니다." : "저장을 누르면 내용이 보관되고, 언제든 다시 열어 고칠 수 있습니다."}</div>
                    {screen.fields.map((f: any, i: number) => {
                      const ty = st.typed[f.key];
                      return (
                        <label className={"field" + (st.focusKey === f.key ? " focus" : "")} key={f.key}>
                          <span className="label"><span className="fnum">{i + 1}</span>{f.label}</span>
                          <textarea data-key={f.key} placeholder={f.placeholder || ""} rows={3} value={(ty?.text || "") + (ty?.caret ? "|" : "")} readOnly />
                        </label>
                      );
                    })}
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
          </div>
        </main>
      </div>
    </div>
  );
};

