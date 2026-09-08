// 대본 + 오디오 길이 → 프레임 단위 타임라인
export const FPS = 30;
export const GAP = 14;          // 문장 사이 쉼
export const TRANSITION = 18;   // 화면 전환 프레임
export const TAIL = 30;         // 마지막 여백

export type Cue = { id: string; say: string; highlight: number | null; point?: string; tap?: boolean; type?: { key: string; text: string } };
export type ScreenScript = { index: number; title?: string; view?: "module" | "program"; state?: any; cues: Cue[] };
export type Script = { module: string; week: number; title: string; screens: ScreenScript[] };
export type Manifest = Record<string, { src: string; dur: number; engine: string }>;

export type TCue = Cue & { from: number; frames: number; screen: number; src: string };
export type TScreen = { ord: number; index: number; view: "module" | "program"; state: any; from: number; frames: number; cues: TCue[] };
export type Timeline = { screens: TScreen[]; cues: TCue[]; total: number };

export function buildTimeline(script: Script, manifest: Manifest): Timeline {
  let t = 0;
  const screens: TScreen[] = [];
  const cues: TCue[] = [];
  script.screens.forEach((sc, ord) => {
    const from = t;
    t += TRANSITION;
    const list: TCue[] = [];
    for (const c of sc.cues) {
      const m = manifest[c.id];
      const audio = Math.ceil((m?.dur ?? 1.5) * FPS);
      const extra = c.type ? Math.max(0, c.type.text.length * 3 - audio + 20) : 0; // 타이핑이 말보다 길면 기다림
      const tc: TCue = { ...c, from: t, frames: audio + extra + GAP, screen: ord, src: m?.src ?? "" };
      list.push(tc); cues.push(tc);
      t += tc.frames;
    }
    t += 10;
    screens.push({ ord, index: sc.index ?? 0, view: sc.view ?? "module", state: sc.state ?? null, from, frames: t - from, cues: list });
  });
  return { screens, cues, total: t + TAIL };
}
