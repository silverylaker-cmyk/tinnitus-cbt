// scripts/*.json 와 생성된 manifest.json 을 묶어 src/generated/modules.ts 를 만든다 (오디오가 있는 모듈만 합성에 등록)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const ids = fs.readdirSync(path.join(ROOT, "scripts")).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5))
  .filter((id) => fs.existsSync(path.join(ROOT, "public", "audio", "generated", id, "manifest.json")));
const lines = [
  "// 자동 생성 (tools/make_index.mjs) — 직접 고치지 마세요",
  ...ids.map((id, i) => `import s${i} from "../../scripts/${id}.json";\nimport m${i} from "../../public/audio/generated/${id}/manifest.json";`),
  "export const MODULES = [",
  ...ids.map((id, i) => `  { id: ${JSON.stringify(id)}, script: s${i} as any, manifest: m${i} as any },`),
  "];",
  "",
];
fs.mkdirSync(path.join(ROOT, "src", "generated"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "src", "generated", "modules.ts"), lines.join("\n"));
console.log("modules with audio:", ids.join(", ") || "(none)");
