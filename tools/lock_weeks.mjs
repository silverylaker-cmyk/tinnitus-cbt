// data/program.json(평문) + unlock-codes.json(비공개) → data/program.js (주차 원고 암호화)
//
// unlock-codes.json 은 .gitignore 에 들어 있어 GitHub 에 올라가지 않습니다.
// 파일이 없으면 무작위 코드로 새로 만들고 화면에 보여 줍니다.
// 코드가 비어 있는 주차는 잠그지 않고 처음부터 열어 둡니다.
// 주의: salt 를 바꾸거나 파일을 지우면 환자들이 이미 넣은 코드가 모두 풀려 다시 넣어야 합니다.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "data", "program.json");
const OUT = path.join(ROOT, "data", "program.js");
const CODES = path.join(ROOT, "unlock-codes.json");
const ITER = 200000;

// 브라우저(lock.js)와 똑같이 맞춰야 합니다
const norm = (c) => String(c || "").normalize("NFKC").toUpperCase().replace(/[\s\-_.]/g, "");

const P = JSON.parse(fs.readFileSync(SRC, "utf8"));

if (!fs.existsSync(CODES)) {
  const digits = () => String(crypto.randomInt(100000, 1000000));
  const alnum = (n) => Array.from({ length: n }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[crypto.randomInt(32)]).join("");
  const fresh = {
    "_설명": "주차 열기 코드 — 이 파일은 GitHub 에 올라가지 않습니다(.gitignore). 코드를 바꾼 뒤 python3 tools/build_content.py 를 실행하세요. 코드를 비워 두면 그 주차는 잠그지 않습니다. salt 를 바꾸면 환자들이 넣은 코드가 모두 무효가 됩니다. 대소문자·띄어쓰기·하이픈은 구분하지 않습니다.",
    salt: crypto.randomBytes(16).toString("base64"),
    master: alnum(10),
    weeks: { 1: "", ...Object.fromEntries([2, 3, 4, 5, 6, 7, 8].map((w) => [w, digits()])) },
  };
  fs.writeFileSync(CODES, JSON.stringify(fresh, null, 2) + "\n");
  console.log(`새 코드 파일을 만들었습니다: ${CODES}`);
}
const C = JSON.parse(fs.readFileSync(CODES, "utf8"));
if (!C.salt) throw new Error("unlock-codes.json 에 salt 가 없습니다.");
const salt = Buffer.from(C.salt, "base64");

const lockWeeks = Object.entries(C.weeks || {}).filter(([, c]) => norm(c)).map(([w]) => Number(w)).sort((a, b) => a - b);
// 여러 주차가 같은 코드를 써도 된다(넣을 때마다 한 주차씩 열림). 마스터 코드만 주차 코드와 달라야 한다
if (norm(C.master) && lockWeeks.some((w) => norm(C.weeks[w]) === norm(C.master))) throw new Error("마스터 코드가 주차 코드와 같습니다. 서로 달라야 합니다.");
for (const w of lockWeeks) if (!P.weeks.some((x) => x.week === w)) throw new Error(`없는 주차입니다: ${w}`);

// 브라우저(lock.js)와 같아야 합니다: 코드 → PBKDF2 → 용도별 HKDF
const base = (code) => crypto.pbkdf2Sync(norm(code), salt, ITER, 32, "sha256");
const sub = (b, info) => Buffer.from(crypto.hkdfSync("sha256", b, Buffer.alloc(0), info, 32));
// 내용이 같으면 암호문도 같게(IV 를 내용에서 만든다) — 다시 빌드해도 git 변경이 생기지 않도록
function seal(obj, key) {
  const pt = Buffer.from(JSON.stringify(obj), "utf8");
  const iv = crypto.createHmac("sha256", key).update(pt).digest().subarray(0, 12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(pt), c.final(), c.getAuthTag()]); // WebCrypto 형식: 암호문 + 태그
  return { iv: iv.toString("base64"), ct: ct.toString("base64") };
}

const keys = Object.fromEntries(lockWeeks.map((w) => [w, sub(base(C.weeks[w]), "week-" + w)]));
const b64keys = (ws) => Object.fromEntries(ws.map((w) => [w, keys[w].toString("base64")]));
const weeks = {};
for (const w of lockWeeks) {
  const screens = Object.fromEntries(P.modules.filter((m) => m.week === w).map((m) => [m.id, m.screens]));
  weeks[w] = seal({ week: w, screens }, keys[w]);
}
const master = norm(C.master) ? seal({ keys: b64keys(lockWeeks) }, sub(base(C.master), "master")) : null;

const out = {
  ...P,
  modules: P.modules.map((m) => (lockWeeks.includes(m.week) ? { ...m, screens: null } : m)),
  lock: { v: 1, iter: ITER, salt: C.salt, weeks, master },
};
fs.writeFileSync(OUT, "// 자동 생성 파일 — tools/build_content.py 로 다시 만듭니다. 직접 수정하지 마세요.\n"
  + "// 잠긴 주차의 원고는 암호화되어 있고, 코드는 이 저장소에 없습니다(unlock-codes.json, 비공개).\n"
  + "window.PROGRAM = " + JSON.stringify(out, null, 1) + ";\n");
console.log(`wrote ${OUT} (${fs.statSync(OUT).size.toLocaleString()} bytes) · 잠근 주차: ${lockWeeks.join(", ") || "없음"}${master ? " · 마스터 코드 있음" : ""}`);
