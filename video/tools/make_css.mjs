// webapp/style.css → src/app.css : 뷰포트 기준 미디어쿼리를 컨테이너 쿼리로 바꿔
// 1080px 합성 화면 안에서도 '폰 너비(540px)' 레이아웃이 그대로 적용되게 한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, "..", "..", "style.css"), "utf8");
let css = src
  .replace(/@media \((max-width|min-width): (\d+)px\)/g, "@container phone ($1: $2px)")
  .replace(/@media print \{[\s\S]*?\n\}\n/g, "")
  .replace(/env\(safe-area-inset-(top|bottom)\)/g, "0px");
css += `
/* ---------- 영상 전용 덮어쓰기 (tools/make_css.mjs) ---------- */
.phone { container-type: inline-size; container-name: phone; }
.phone *, .phone *::before, .phone *::after { animation: none !important; transition: none !important; }
.phone .art .draw { stroke-dashoffset: 0; }
.phone .cycle .cyc-node, .phone .cycle .cyc-arrow, .phone .cycle-legend li { opacity: 1; }
.phone .sticky-actions { position: static; background: none; }
.phone .topbar { position: absolute; top: 0; left: 0; right: 0; }
.phone .nav { position: fixed; }
.phone .page { min-height: 0; }
.phone textarea { resize: none; }
`;
fs.mkdirSync(path.join(here, "..", "src"), { recursive: true });
fs.writeFileSync(path.join(here, "..", "src", "app.css"), css);
console.log("wrote src/app.css", css.length, "bytes");
