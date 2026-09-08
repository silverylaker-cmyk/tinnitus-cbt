import React, { useMemo, useState } from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import program from "../../data/program.json";
import { MODULES } from "./generated/modules";
import { Layout, Phone, PhoneState } from "./Phone";
import { buildTimeline, TCue, TRANSITION } from "./lib/timeline";

const KIND_LABEL: Record<string, string> = { learn: "학습", write: "작성", homework: "숙제", assess: "확인", summary: "정리" };
const VIEW_H = 880 - 56 - 72; // 폰 화면에서 본문이 보이는 높이
const SCROLL_T = 22;           // 스크롤 이동 프레임
const TAP_AT = 28;             // 큐 시작 후 몇 프레임 뒤에 누르는지
const TYPE_SPEED = 3;          // 프레임/글자

const Hand: React.FC<{ x: number; y: number; press: number }> = ({ x, y, press }) => (
  <svg className="pointer" width="64" height="72" viewBox="0 0 64 72" style={{ left: x - 14, top: y - 6, transform: `scale(${0.85 - press * 0.1})`, transformOrigin: "14px 6px" }}>
    <path d="M14 6v30l-6-7c-2-2.5-6-2-7 1-.6 1.6-.2 3 .8 4.3L18 52c3 4 7 6 12 6h10c8 0 14-6 14-14V30c0-2.5-2-4.5-4.5-4.5S45 27.5 45 30v-2c0-2.5-2-4.5-4.5-4.5S36 25.5 36 28v-2c0-2.5-2-4.5-4.5-4.5S27 23.5 27 26V6c0-3.6-2.9-6.5-6.5-6.5S14 2.4 14 6z" fill="#fff" stroke="#141413" strokeWidth="3" strokeLinejoin="round" />
  </svg>
);

export const Narration: React.FC<{ moduleId: string }> = ({ moduleId }) => {
  const entry = MODULES.find((m) => m.id === moduleId)!;
  const mod = (program as any).modules.find((m: any) => m.id === moduleId);
  const tl = useMemo(() => buildTimeline(entry.script, entry.manifest), [entry]);
  const frame = useCurrentFrame();
  const [layouts, setLayouts] = useState<Record<number, Layout>>({});

  const scr = tl.screens.filter((s) => s.from <= frame).pop() ?? tl.screens[0];
  const lay = layouts[scr.ord];
  const cueNow = scr.cues.filter((c) => c.from <= frame).pop() ?? null;
  const cueIdx = cueNow ? scr.cues.indexOf(cueNow) : -1;
  const selectors = useMemo(() => Array.from(new Set(scr.cues.map((c) => c.point).filter(Boolean) as string[])), [scr]);

  // ---- 스크롤 목표: 강조 문장은 위쪽 1/3, 가리키는 요소는 아래쪽 2/3 근처에 오도록
  const targetOf = (c: TCue | null): number => {
    if (!c || !lay) return 0;
    const max = Math.max(0, lay.pageHeight - VIEW_H);
    let y = 0;
    if (c.highlight != null && lay.sentences[c.highlight]) y = lay.sentences[c.highlight].top - 150;
    else if (c.point && lay.targets[c.point]) y = lay.targets[c.point].top + lay.targets[c.point].height / 2 - VIEW_H * 0.62;
    else if (c.type && lay.targets[`textarea[data-key="${c.type.key}"]`]) y = lay.targets[`textarea[data-key="${c.type.key}"]`].top - VIEW_H * 0.35;
    else return -1;
    return Math.min(max, Math.max(0, y));
  };
  let prevT = 0, curT = 0;
  for (let i = 0; i <= cueIdx; i++) { const t = targetOf(scr.cues[i]); if (t >= 0) { prevT = curT; curT = t; if (i === cueIdx) break; } if (i === cueIdx) prevT = curT; }
  const scroll = cueNow ? interpolate(frame, [cueNow.from, cueNow.from + SCROLL_T], [prevT, curT], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }) : 0;

  // ---- 타이핑 상태 (이 화면에서 지금까지 나온 타이핑 큐 누적)
  const typed: PhoneState["typed"] = {};
  let focusKey: string | null = null;
  for (const c of scr.cues) {
    if (c.from > frame || !c.type) continue;
    const n = Math.max(0, Math.floor((frame - c.from - 12) / TYPE_SPEED));
    const full = n >= c.type.text.length;
    typed[c.type.key] = { text: c.type.text.slice(0, n), caret: c === cueNow && (!full || Math.floor(frame / 15) % 2 === 0) };
    if (c === cueNow) focusKey = c.type.key;
  }
  if (cueNow?.point?.startsWith("textarea")) focusKey = cueNow.point.match(/"(.+)"/)?.[1] ?? null;

  const done = new Set<number>();
  for (const c of scr.cues) if (c !== cueNow && c.from < frame && c.highlight != null) done.add(c.highlight);
  const tapping = !!cueNow?.tap && frame >= cueNow.from + TAP_AT && frame < cueNow.from + TAP_AT + 10;
  const st: PhoneState = { highlight: cueNow?.highlight ?? null, done, dim: cueNow?.highlight != null, typed, focusKey, tapped: tapping ? cueNow!.point! : null, scroll };

  // ---- 포인터(손) 위치
  let hand: { x: number; y: number; press: number; ripple: number } | null = null;
  if (cueNow?.point && lay?.targets[cueNow.point]) {
    const r = lay.targets[cueNow.point];
    const tx = r.left + Math.min(r.width * 0.72, 200), ty = r.top + r.height * 0.62 - scroll + 56;
    const prev = cueIdx > 0 ? scr.cues.slice(0, cueIdx).reverse().find((c) => c.point && lay.targets[c.point!]) : null;
    const p0 = prev ? { x: lay.targets[prev.point!].left + Math.min(lay.targets[prev.point!].width * 0.72, 200), y: lay.targets[prev.point!].top + lay.targets[prev.point!].height * 0.62 - scroll + 56 } : { x: 620, y: 960 };
    const k = interpolate(frame, [cueNow.from, cueNow.from + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    const press = cueNow.tap ? interpolate(frame, [cueNow.from + TAP_AT - 4, cueNow.from + TAP_AT, cueNow.from + TAP_AT + 8], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
    const ripple = cueNow.tap ? interpolate(frame, [cueNow.from + TAP_AT, cueNow.from + TAP_AT + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
    hand = { x: p0.x + (tx - p0.x) * k, y: p0.y + (ty - p0.y) * k, press, ripple };
  }

  // ---- 화면 전환
  const enter = interpolate(frame, [scr.from, scr.from + TRANSITION], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const subFade = cueNow ? interpolate(frame, [cueNow.from, cueNow.from + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill className="stage">
      {tl.cues.map((c) => c.src ? <Sequence key={c.id} from={c.from} durationInFrames={c.frames} name={c.id}><Audio src={staticFile(c.src)} /></Sequence> : null)}
      <div className="header">
        <span><b>{mod.week}주차</b> · {KIND_LABEL[mod.kind]}</span>
        <span className="accent">{scr.ord + 1} / {tl.screens.length}</span>
      </div>
      <div className="phone-wrap" style={{ opacity: enter, transform: `translateX(-50%) scale(1.5) translateY(${(1 - enter) * 24}px)` }}>
        <div style={{ position: "relative" }}>
          <Phone key={scr.ord} program={program} mod={mod} index={scr.index} view={scr.view} vstate={scr.state} st={st} selectors={selectors} onLayout={(l) => setLayouts((o) => ({ ...o, [scr.ord]: l }))} />
          {hand && hand.ripple > 0 && hand.ripple < 1 && <div className="ripple" style={{ left: hand.x - 40 * hand.ripple, top: hand.y - 40 * hand.ripple, width: 80 * hand.ripple, height: 80 * hand.ripple, opacity: 1 - hand.ripple }} />}
          {hand && <Hand x={hand.x} y={hand.y} press={hand.press} />}
        </div>
      </div>
      <div className="subtitle" style={{ opacity: cueNow ? 1 : 0.6 }}>
        <span className="lbl">{mod.title}</span>
        <span style={{ opacity: subFade }}>{cueNow?.say ?? ""}</span>
      </div>
    </AbsoluteFill>
  );
};
