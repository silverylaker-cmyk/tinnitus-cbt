// 렌더가 끝난 영상을 ~/mydrive/CBT/나레이션영상/ 에 주차별로 정리한다.
// 사용: node tools/publish_videos.mjs [--pending=week3_homework,week2_worksheet]
//   --pending 에 적은 모듈은 (재렌더 대기) 아직 복사하지 않는다.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const P = JSON.parse(fs.readFileSync(path.join(ROOT, "..", "data", "program.json"), "utf8"));
const DEST = path.join(os.homedir(), "mydrive", "CBT", "나레이션영상");
const pending = new Set((process.argv.find((a) => a.startsWith("--pending="))?.slice(10) || "").split(",").filter(Boolean));
const san = (s) => s.replace(/:/g, "·").replace(/\//g, "-").trim();
const WEEKT = Object.fromEntries(P.weeks.map((w) => [w.week, w.title]));
// 아직 쓰는 중인 파일은 ffprobe 가 실패한다 → null 로 보고 건너뛴다
const dur = (f) => { try { return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()) || null; } catch (e) { return null; } };
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

const rows = [];
const missing = [];
for (const m of P.modules) {
  const src = path.join(ROOT, "out", `${m.id}.mp4`);
  const week = m.week;
  const idx = P.modules.filter((x) => x.week === week).indexOf(m) + 1;
  const name = `${week}-${idx} ${san(m.title)}.mp4`;
  if (!fs.existsSync(src) || pending.has(m.id)) { missing.push({ week, name, why: pending.has(m.id) ? "재렌더 대기" : "렌더 전" }); continue; }
  const sec = dur(src);
  if (sec == null) { missing.push({ week, name, why: "렌더 중" }); continue; }
  const dir = path.join(DEST, `${week}주차 ${san(WEEKT[week])}`);
  fs.mkdirSync(dir, { recursive: true });
  const dst = path.join(dir, name);
  const fresh = !fs.existsSync(dst) || fs.statSync(src).mtimeMs > fs.statSync(dst).mtimeMs;
  if (fresh) fs.copyFileSync(src, dst);
  rows.push({ week, name, sec, updated: fresh });
}

// 목록 파일
const byWeek = {};
for (const r of rows) (byWeek[r.week] ||= []).push(r);
const lines = ["# 이명 CBT 나레이션 영상", "", `정리한 날: ${new Date().toISOString().slice(0, 10)}`, ""];
let total = 0;
for (const w of Object.keys(byWeek).map(Number).sort((a, b) => a - b)) {
  const list = byWeek[w];
  const sum = list.reduce((a, r) => a + r.sec, 0); total += sum;
  lines.push(`## ${w}주차 ${WEEKT[w]} — ${list.length}편 · ${mmss(sum)}`);
  for (const r of list) lines.push(`- ${r.name.replace(/\.mp4$/, "")} (${mmss(r.sec)})`);
  lines.push("");
}
lines.push(`합계 ${rows.length}편 · ${Math.floor(total / 60)}분`, "");
if (missing.length) {
  lines.push("## 아직 없는 편", "");
  for (const m of missing) lines.push(`- ${m.week}주차 ${m.name.replace(/\.mp4$/, "")} — ${m.why}`);
  lines.push("");
}
fs.mkdirSync(DEST, { recursive: true });
fs.writeFileSync(path.join(DEST, "목록.md"), lines.join("\n"));

console.log(`정리 ${rows.length}편 (새로 복사 ${rows.filter((r) => r.updated).length})`);
if (missing.length) console.log(`아직 없음 ${missing.length}편: ${missing.map((m) => m.name.replace(/\.mp4$/, "")).join(", ")}`);
