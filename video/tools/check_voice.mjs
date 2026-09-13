// 육성 파일 누락 검사: scripts/<모듈>.json 의 큐마다 public/audio/voice/<모듈>/<큐id>.(wav|mp3|m4a) 가 있는지
// 사용: node tools/check_voice.mjs [moduleId ...]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const ids = process.argv.slice(2);
const all = fs.readdirSync(path.join(ROOT, "scripts")).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
let missingTotal = 0, cueTotal = 0;
for (const id of ids.length ? ids : all) {
  const script = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", `${id}.json`), "utf8"));
  const dir = path.join(ROOT, "public", "audio", "voice", id);
  const missing = [];
  for (const sc of script.screens) for (const c of sc.cues) {
    cueTotal++;
    if (!["wav", "mp3", "m4a"].some((e) => fs.existsSync(path.join(dir, `${c.id}.${e}`)))) missing.push(c.id);
  }
  missingTotal += missing.length;
  console.log(`${id}: ${missing.length ? `빠진 큐 ${missing.length}개 — ${missing.join(", ")}` : "모두 있음"}`);
}
console.log(`합계: 큐 ${cueTotal}개 중 ${missingTotal}개 없음`);
