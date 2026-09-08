// 본문 텍스트를 앱의 renderBody와 같은 구조(문단/목록/인용/소제목)로 나누되,
// 각 줄을 다시 '문장' 단위로 쪼갠다. 나레이션 1문장 = 오디오 1개 = 강조 1구간.
// (app.js의 renderBody 규칙을 그대로 따른다 — 내용은 바꾸지 않고 자르기만 한다)

/** 한 줄을 문장으로 나눈다. 따옴표 안의 마침표는 자르지 않는다. */
export function splitSentences(line) {
  const out = [];
  let buf = "", depth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    buf += ch;
    if (ch === "“" || ch === "\"" && depth === 0 || ch === "(") depth++;
    else if (ch === "”" || ch === "\"" && depth > 0 || ch === ")") depth = Math.max(0, depth - 1);
    const end = /[.?!]/.test(ch) && depth === 0 && (i + 1 >= line.length || /\s/.test(line[i + 1]));
    if (end) { out.push(buf.trim()); buf = ""; }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

/**
 * @returns {{blocks: Array, sentences: string[]}}
 * blocks: {type:"p"|"quote"|"lead", parts:[{s:number,text:string}]}
 *         {type:"ul"|"ol", items:[[{s,text}]]}
 * s = 화면 안 문장 번호 (0 = 제목, 1.. = 본문)
 */
export function parseBody(title, body) {
  const sentences = [title];
  let n = 1;
  const mk = (text) => splitSentences(text).map((t) => ({ s: n++, text: (sentences.push(t), t) }));
  const isUl = (l) => /^- /.test(l), isOl = (l) => /^\d+\. /.test(l);
  const blocks = [];
  for (const block of (body || "").split(/\n\s*\n/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.length === 1 && /^["“].+["”]$/.test(lines[0])) { blocks.push({ type: "quote", parts: mk(lines[0]) }); continue; }
    const hasList = lines.some((l) => isUl(l) || isOl(l));
    if (!hasList) { blocks.push({ type: "p", parts: lines.flatMap((l, i) => (i ? [{ br: true }] : []).concat(mk(l))) }); continue; }
    let buf = [], bufType = null;
    const flush = () => { if (buf.length) blocks.push({ type: bufType, items: buf }); buf = []; bufType = null; };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const ty = isUl(l) ? "ul" : isOl(l) ? "ol" : null;
      if (ty === "ol" && lines[i + 1] && isUl(lines[i + 1])) { flush(); blocks.push({ type: "lead", parts: mk(l) }); continue; }
      if (!ty) { flush(); blocks.push({ type: "lead", parts: mk(l) }); continue; }
      if (bufType && bufType !== ty) flush();
      bufType = ty; buf.push(mk(ty === "ul" ? l.slice(2) : l.replace(/^\d+\. /, "")));
    }
    flush();
  }
  return { blocks, sentences };
}
