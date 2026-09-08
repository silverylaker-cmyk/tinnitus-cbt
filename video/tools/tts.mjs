// 대본의 문장마다 오디오 1개를 만든다.
//   public/audio/voice/<module>/<cueId>.(wav|mp3|m4a)  ← 직접 녹음한 육성이 있으면 그것을 우선 사용
//   public/audio/generated/<module>/<cueId>.wav        ← 없으면 TTS 생성 (Gemini, 없으면 macOS say)
// 결과: public/audio/generated/<module>/manifest.json  { cueId: { src, dur } }
// 사용: node tools/tts.mjs [moduleId ...] [--force] [--engine=gemini|say]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const PUB = path.join(ROOT, "public");
// .env (gitignored) 읽기 — 키를 채팅이나 저장소에 넣지 않는다
const envFile = path.join(ROOT, ".env");
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const args = process.argv.slice(2);
const force = args.includes("--force");
const engineArg = args.find((a) => a.startsWith("--engine="))?.slice(9);
const ids = args.filter((a) => !a.startsWith("--"));
const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const engine = engineArg || (KEY ? "gemini" : "say");
const MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview"; // AI Studio 2026-09 기준
const VOICE = process.env.GEMINI_TTS_VOICE || "Enceladus";
const STYLE = process.env.TTS_STYLE || "차분하고 따뜻한 목소리로, 어르신께 설명하듯 천천히 또박또박 읽어 주세요:";
if (engine === "gemini" && !KEY) { console.error("GEMINI_API_KEY 가 없습니다. video/.env 에 GEMINI_API_KEY=... 를 넣거나 --engine=say 로 실행하세요."); process.exit(1); }

const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());
function wavFromPcm(pcm, rate = 24000, ch = 1, bits = 16) {
  const h = Buffer.alloc(44), bps = ch * bits / 8;
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * bps, 28); h.writeUInt16LE(bps, 32); h.writeUInt16LE(bits, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
async function gemini(text, out) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const body = { contents: [{ role: "user", parts: [{ text: `${STYLE}\n\n## Transcript:\n${text}` }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } } };
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { method: "POST", headers: { "x-goog-api-key": KEY, "content-type": "application/json" }, body: JSON.stringify(body) });
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 3000 * (attempt + 1))); continue; }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json();
    const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part) throw new Error("응답에 오디오가 없습니다: " + JSON.stringify(j).slice(0, 300));
    const mime = part.inlineData.mimeType || "";
    const data = Buffer.from(part.inlineData.data, "base64");
    if (/L16|pcm/i.test(mime)) { const rate = Number(mime.match(/rate=(\d+)/)?.[1] || 24000); fs.writeFileSync(out, wavFromPcm(data, rate)); }
    else { const tmp = out + ".bin"; fs.writeFileSync(tmp, data); execFileSync("ffmpeg", ["-y", "-v", "error", "-i", tmp, "-ar", "24000", "-ac", "1", out]); fs.unlinkSync(tmp); }
    return;
  }
  throw new Error("Gemini TTS 재시도 실패: " + text.slice(0, 40));
}
function say(text, out) {
  const aiff = out + ".aiff";
  execFileSync("say", ["-v", process.env.SAY_VOICE || "Yuna", "-r", process.env.SAY_RATE || "165", "-o", aiff, text]);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", aiff, "-ar", "24000", "-ac", "1", out]);
  fs.unlinkSync(aiff);
}

const scriptFiles = fs.readdirSync(path.join(ROOT, "scripts")).filter((f) => f.endsWith(".json"));
const targets = scriptFiles.map((f) => f.replace(/\.json$/, "")).filter((id) => !ids.length || ids.includes(id));
for (const id of targets) {
  const script = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", `${id}.json`), "utf8"));
  const genDir = path.join(PUB, "audio", "generated", id), voiceDir = path.join(PUB, "audio", "voice", id);
  fs.mkdirSync(genDir, { recursive: true });
  const prevFile = path.join(genDir, "manifest.json");
  const prev = fs.existsSync(prevFile) ? JSON.parse(fs.readFileSync(prevFile, "utf8")) : {};
  const manifest = {}; let made = 0, own = 0;
  for (const sc of script.screens) for (const cue of sc.cues) {
    const voice = ["wav", "mp3", "m4a"].map((e) => path.join(voiceDir, `${cue.id}.${e}`)).find(fs.existsSync);
    let file = voice;
    if (voice) own++;
    else {
      file = path.join(genDir, `${cue.id}.wav`);
      const changed = prev[cue.id] && prev[cue.id].say !== undefined && prev[cue.id].say !== cue.say; // 대본이 바뀐 문장
      if (force || changed || !fs.existsSync(file)) { process.stdout.write(`  [${engine}] ${id}/${cue.id}: ${cue.say.slice(0, 32)}…\n`); if (engine === "gemini") await gemini(cue.say, file); else say(cue.say, file); made++; }
    }
    manifest[cue.id] = { src: path.relative(PUB, file), dur: dur(file), engine: voice ? "voice" : engine, say: cue.say };
  }
  fs.writeFileSync(path.join(genDir, "manifest.json"), JSON.stringify(manifest, null, 1));
  console.log(`${id}: ${Object.keys(manifest).length} cues (new ${made}, own voice ${own}), total ${Object.values(manifest).reduce((a, b) => a + b.dur, 0).toFixed(1)}s`);
}
