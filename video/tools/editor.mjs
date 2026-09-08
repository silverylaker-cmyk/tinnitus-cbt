// 대본 편집기: node tools/editor.mjs → http://localhost:8091
// scripts/*.json 을 브라우저에서 고치고 저장한다 (저장 시 .bak 자동 생성)
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const SCRIPTS = path.join(ROOT, "scripts");
const PORT = Number(process.env.PORT || 8091);
const json = (res, code, obj) => { res.writeHead(code, { "content-type": "application/json; charset=utf-8" }); res.end(JSON.stringify(obj)); };
const safe = (id) => /^[a-z0-9_]+$/.test(id);
http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(fs.readFileSync(path.join(here, "editor.html"))); return; }
  if (u.pathname === "/lib/sentences.js") { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }); res.end(fs.readFileSync(path.join(ROOT, "src", "lib", "sentences.js"))); return; }
  if (u.pathname === "/api/program") { res.writeHead(200, { "content-type": "application/json; charset=utf-8" }); res.end(fs.readFileSync(path.join(ROOT, "..", "data", "program.json"))); return; }
  if (u.pathname === "/api/list") { json(res, 200, fs.readdirSync(SCRIPTS).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5))); return; }
  const m = u.pathname.match(/^\/api\/script\/([a-z0-9_]+)$/);
  if (m && safe(m[1])) {
    const file = path.join(SCRIPTS, m[1] + ".json");
    if (req.method === "GET") { if (!fs.existsSync(file)) return json(res, 404, { error: "없음" }); res.writeHead(200, { "content-type": "application/json; charset=utf-8" }); res.end(fs.readFileSync(file)); return; }
    if (req.method === "PUT") {
      let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
        try { const obj = JSON.parse(body); if (!obj.screens) throw new Error("screens 없음"); if (fs.existsSync(file)) fs.copyFileSync(file, file + ".bak"); fs.writeFileSync(file, JSON.stringify(obj, null, 1) + "\n"); json(res, 200, { ok: true }); }
        catch (e) { json(res, 400, { error: String(e.message || e) }); }
      }); return;
    }
  }
  const a = u.pathname.match(/^\/api\/manifest\/([a-z0-9_]+)$/);
  if (a && safe(a[1])) { const f = path.join(ROOT, "public", "audio", "generated", a[1], "manifest.json"); if (!fs.existsSync(f)) return json(res, 200, {}); res.writeHead(200, { "content-type": "application/json" }); res.end(fs.readFileSync(f)); return; }
  if (u.pathname.startsWith("/audio/")) { const f = path.join(ROOT, "public", decodeURIComponent(u.pathname)); if (!f.startsWith(path.join(ROOT, "public")) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "content-type": "audio/wav" }); fs.createReadStream(f).pipe(res); return; }
  res.writeHead(404); res.end("not found");
}).listen(PORT, () => console.log(`대본 편집기: http://localhost:${PORT}`));
