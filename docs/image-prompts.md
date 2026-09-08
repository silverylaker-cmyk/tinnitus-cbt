# 삽화 생성 프롬프트 (GPT 이미지 생성용)

## 사용법
1. 아래 **공통 스타일 블록**을 먼저 붙여 넣고, 그 뒤에 각 장의 프롬프트를 이어 붙입니다. (한 대화에서 연속 생성하면 스타일이 더 일정하게 유지됩니다.)
2. 생성 후 `img/` 폴더에 표의 파일 이름으로 저장합니다. 형식은 WebP(권장) 또는 PNG, 긴 변 1600px 이내.
3. 마음에 안 드는 장은 "same style, same palette, ..." 를 붙여 다시 생성하면 결이 맞습니다.
4. 저장 후 알려 주시면 화면에 연결합니다.

크기: 주차 대표 그림은 **3:2 (예: 1536×1024)**, 개념 그림은 **1:1 (1024×1024)**.

---

## 공통 스타일 블록 (모든 프롬프트 앞에 붙임)

```
Editorial illustration for a calm medical self-help app. Minimal, warm, hand-drawn line art with a few flat color fills.
Palette strictly: warm cream background (#F5F3EC), soft near-black ink lines (#141413), one terracotta accent (#C2542F) used sparingly, muted sand (#E8C9B8) for light fills. No other colors.
Generous empty space, soft grain, matte paper feel. Slightly imperfect, human, gentle. Style reference: modern editorial illustrations on a technology company homepage — quiet, abstract, elegant, not cute, not cartoonish, not clinical.
No text, no letters, no numbers, no logos, no watermark. No medical equipment, no ears in close-up, no pain imagery, no red alarm colors. If a person appears: simplified figure, no detailed face, calm posture, Korean adult of ambiguous age.
```

---

## A. 주차별 대표 그림 (3:2, 8장)

| 파일 | 주차 | 의도 |
|---|---|---|
| `img/week1.webp` | 1주차 이명 이해하기 | 소리는 그대로인데 반응이 고리를 만든다 |
| `img/week2.webp` | 2주차 생각 다루기 | 스쳐 가는 자동사고를 붙잡아 종이에 옮김 |
| `img/week3.webp` | 3주차 주의 옮기기 | 스포트라이트를 이명에서 호흡으로 옮김 |
| `img/week4.webp` | 4주차 행동으로 확인하기 | 믿음을 실험으로 검증, 작은 한 걸음 |
| `img/week5.webp` | 5주차 몸을 이완하기 | 긴장했다가 풀리는 몸, 파도가 가라앉듯 |
| `img/week6.webp` | 6주차 이완을 실전으로 | 한 번의 긴 숨과 단서어, 일상 속 순간 |
| `img/week7.webp` | 7주차 밤과 잠 | 조용한 밤, 낮은 소리, 기다리는 잠 |
| `img/week8.webp` | 8주차 이명과 함께 살아가기 | 구름은 지나가고 하늘은 그대로, 가치를 향해 걷기 |

**week1**
```
[공통 스타일 블록]
A single small circle (a sound) sits quietly at the left. From it, a thin ink line loops around into a large circular path that returns to itself — a cycle. Along the loop, three tiny abstract marks: a thought-bubble shape, a tense zigzag, a heavier stroke. The sound circle itself stays small and unchanged; only the loop grows thicker. Terracotta accent on one short segment of the loop. Wide cream space around. Concept: the sound is the same; the reaction makes the loop.
```

**week2**
```
[공통 스타일 블록]
A simplified seated figure holds a small sheet of paper. Above the head, several faint scribbled thought-clouds drift away like smoke; one of them is caught and drawn onto the paper as a clean single line. The caught thought is outlined in terracotta. Everything else in ink on cream. Concept: catching a passing automatic thought and putting it on paper.
```

**week3**
```
[공통 스타일 블록]
A soft cone of light, like a theater spotlight, drawn with two thin lines and a pale sand fill. At its base, a small circle representing breath (concentric gentle rings). Off to the side, in the dim area outside the light, a small ringing-sound mark (three short arcs) sits unlit and quiet. The spotlight is turned toward the breath, not the sound. Terracotta accent only on the breath rings. Concept: attention is a spotlight you can move.
```

**week4**
```
[공통 스타일 블록]
A doorway drawn in ink stands slightly open on cream; through it, a bright, simple outdoor scene (a bench under a tree, or a café table) rendered in a few lines. In front of the door, one footprint or a single step mark in terracotta. A small notebook with a checkbox shape rests near the step. Concept: testing a belief by taking one small real step.
```

**week5**
```
[공통 스타일 블록]
Three horizontal wave lines stacked vertically. The top wave is tight and jagged (tension), the middle one softer, the bottom one long and smooth, nearly flat (release). A tiny simplified reclining figure rests on the bottom wave. Terracotta accent on the transition point where the jagged wave becomes smooth. Concept: tense, then let go; the body learns the difference.
```

**week6**
```
[공통 스타일 블록]
A single long exhale drawn as one flowing ink line moving left to right, thinning as it goes, with a small terracotta dot at the end like a period. Around it, faint hints of everyday life: a desk corner, a cup, a window — drawn very lightly so they nearly disappear. Concept: one breath and a cue word, usable anywhere in daily life.
```

**week7**
```
[공통 스타일 블록]
A quiet night scene: a thin crescent moon, a dark-ink horizon line, and a small bedside lamp turned low, drawn in a few strokes. Near the pillow, gentle low sound waves (three very soft arcs) at small size. A simple sleeping figure suggested by a single curved line under a blanket. Mostly cream with ink; terracotta only on the tiny lamp glow. Concept: quiet night, low sound, letting sleep come rather than chasing it.
```

**week8**
```
[공통 스타일 블록]
A wide open sky drawn with almost nothing: one small cloud passing at the edge, a faint sun circle. On the ground line, a simplified figure walks forward with a relaxed stride, toward a small distant marker (a tree, a bench, another figure) that represents something they value. The cloud does not block the path. Terracotta accent on the distant marker. Concept: the cloud passes, the sky remains; walk toward what matters.
```

---

## B. 개념 그림 (1:1, 5장)

| 파일 | 쓰이는 곳 | 의도 |
|---|---|---|
| `img/concept-cycle.webp` | 1주차 악순환 고리 화면, 1주차 워크시트 | 소리→생각→감정→몸→더 크게 들림→다시 |
| `img/concept-spotlight.webp` | 3주차 주의는 유한한 자원 | 무대 위 스포트라이트 하나 |
| `img/concept-wave.webp` | 8주차 재발이 아니라 파도 | 올라갔다 반드시 내려오는 파도 |
| `img/concept-guest.webp` | 8주차 초대받지 않은 손님 | 파티 한구석의 손님, 주인은 친구들과 |
| `img/concept-safety.webp` | 4주차 안전행동 | 보호막이 오히려 가두는 덫 |

**concept-cycle**
```
[공통 스타일 블록]
A circular diagram made of six small abstract icons connected by thin ink arrows into a loop: a small sound mark (three arcs), a thought cloud, a heart with a tremble line, a tense shoulder shape, a larger sound mark, and back to the start. No labels, no numbers. The arrows are thin; one arrow is terracotta to show the loop can be cut there. Centered on cream, square composition.
```

**concept-spotlight**
```
[공통 스타일 블록]
An empty stage seen from the audience, drawn with a few horizontal lines. One narrow spotlight cone from above illuminates a small area on the stage (pale sand fill). The rest of the stage is barely visible in faint ink. Nothing is inside the light except a small calm circle. Terracotta only on the spotlight's source. Concept: attention can light only one place at a time.
```

**concept-wave**
```
[공통 스타일 블록]
One large ocean wave drawn as a single confident ink line: it rises steeply on the left, crests, and settles into a calm flat line on the right that continues to the edge. A tiny simplified figure stands on the calm part, looking back at the wave without fear. Terracotta accent only on the crest. Concept: a hard day is a wave; it always comes down.
```

**concept-guest**
```
[공통 스타일 블록]
A warm living-room party drawn in light ink: a few simplified figures gathered around a table, talking, drawn with open, friendly posture. In a far corner, one small grumpy figure sits alone with folded arms, drawn smaller and fainter. The host figure faces the friends, not the corner. Terracotta accent on the host's cup or the table. Concept: the uninvited guest is ignored; the party goes on.
```

**concept-safety**
```
[공통 스타일 블록]
A simplified figure inside a translucent dome or bell jar drawn with one thin ink line. Outside the dome, gentle everyday sounds and life are suggested by faint marks (a bird, a small crowd, a café). The dome was meant as protection but reads as a small cage; the figure looks out. A thin terracotta line marks a small opening at the base of the dome, suggesting a way out. Concept: safety behaviors protect and trap at the same time.
```

---

## 재생성 팁
- 스타일이 튀면: `same style and palette as the previous image, simpler, fewer elements, more empty space`
- 너무 사실적이면: `flatter, more abstract, editorial illustration, no shading, no 3D`
- 글자가 생기면: `absolutely no text or letters anywhere`
- 얼굴이 자세하면: `no facial features, figure simplified to a few lines`
