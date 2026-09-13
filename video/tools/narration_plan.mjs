// 8주 나레이션 계획 v2 — 모듈별 큐 정의 (make_scripts_v2.mjs 가 읽는다)
//
// 원칙
//  1. 드라마 영상(치료사·할머니 대화)에서 이미 다룬 화면은 다 읽지 않는다.
//     "이 화면에는 ○○ 내용이 있습니다. 영상에서 보신 내용이니 집에서 천천히 반복해서 읽어 보세요." 로 넘긴다.
//  2. 드라마에서 다루지 않은 화면(방법 안내, 도구, 도구상자, 파도 등)은 문장을 그대로 읽으며 상세히 설명한다.
//  3. 일기·워크시트 등 기록을 쓰는 화면은 칸마다 무엇을 적는지 예시로 보여 주고,
//     쓴 기록을 어디서 다시 보는지, 더 적거나 고치려면 어떻게 하는지를 반드시 설명한다.
//  4. 그림이 들어가면 좋은 화면은 image(파일 이름·프롬프트)를 남긴다.
//  5. say 는 육성 TTS용 — 숫자는 한글, 한 큐 = 한두 문장, 기호 없이.

const STYLE = `Editorial illustration for a calm medical self-help app. Minimal, warm, hand-drawn line art with a few flat color fills.
Palette strictly: warm cream background (#F5F3EC), soft near-black ink lines (#141413), one terracotta accent (#C2542F) used sparingly, muted sand (#E8C9B8) for light fills. No other colors.
Generous empty space, soft grain, matte paper feel. Slightly imperfect, human, gentle. Not cute, not cartoonish, not clinical.
No text, no letters, no numbers, no logos, no watermark. No medical equipment, no ears in close-up, no pain imagery. If a person appears: simplified figure, no detailed face, calm posture, Korean adult of ambiguous age.`;

const img = (file, use, prompt, size = "1:1 (1024×1024)") => ({ file: `img/${file}`, use, size, prompt: `[공통 스타일 블록]\n${prompt}` });

export const META = {
  skimClose: "영상에서 이미 보신 내용입니다. 집에서 천천히 반복해서 읽어 보세요.",
  style: STYLE,
  // 드라마 영상(완성본 기준) ↔ 웹앱 모듈 대응. mode: 요약 / 상세 / 혼합
  drama: [
    { id: "W1-A", title: "악순환의 고리", file: "W1A_FINAL_18클립_v4.mp4", dur: "3분 24초", covers: "프로그램 목표(없애기 아닌 반응 바꾸기, 진료와 병행, 하루 10~15분), 악순환 고리 5단계, 안심 정보(청력 악화 아님, 흔한 현상)" },
    { id: "W2-A", title: "자동사고 알아차리기", file: "W2A_FINAL_23클립_v1.mp4", dur: "4분 22초", covers: "일기 첫 주 회고, 소리와 괴로움 사이의 '생각', 자동사고의 뜻, 대안 생각(피곤해서 크게 느껴지나 보다), 파국적 생각 예시 3가지, '없애지 않고 알아차리기'. 사고기록지 방법은 '이어서 알려드릴게요'로 미룸" },
    { id: "W3-A", title: "스포트라이트(손전등)", file: "W3A_FINAL_20클립_v1.mp4", dur: "4분 30초", covers: "주의는 한 곳만 비춘다(손전등), 위협으로 여길수록 더 잘 들림, 억지로 안 들으려는 것도 비추는 일(흰 곰), 알아차리고 부드럽게 돌리기, 다시 돌아가도 당연, 반복이 근육. 마음챙김 호흡 '방법'은 없음" },
    { id: "W4-A", title: "안전행동", file: "W4A_FINAL_28클립_v2.mp4", dur: "4분 37초", covers: "귀마개·이명 확인·소리 크게 틀기, 뇌의 잘못된 학습, 손전등 회상, 소리 치료 볼륨, 보호막 두려움, 안전한 상황부터 작은 실험" },
    { id: "W4-B", title: "실험을 설계하다", file: "W4B_FINAL_24클립_v2.mp4", dur: "3분 40초", covers: "활동 줄이기도 안전행동, 피할수록 믿음이 굳음, 행동실험의 뜻, 예상·확률·실행·비교, 실패는 없다" },
    { id: "W5-A", title: "몸이 경계 태세일 때", file: "W5A_FINAL_v2.mp4", dur: "3분 32초", covers: "스트레스 → 긴장 → 귀 예민 → 이명 → 다시 스트레스 고리, 이완은 배우는 기술, 힘을 줬다 푸는 이유. 전신 순서·기본 동작(5~7초, 10~15초)은 없음" },
    { id: "W6-A", title: "파블로프의 개", file: "W6A_FINAL_v2.mp4", dur: "3분 22초", covers: "긴 이완의 한계, 응용이완법, 종소리와 침, 단서어 고르기, 내쉬는 숨과 짝짓기. 축약 이완 3단계·어깨/턱/이마는 없음" },
    { id: "W7-A", title: "밤이 가장 힘든 이유", file: "W7A_HQ_seedvr2_2x_48fps.mp4", dur: "3분 06초", covers: "조용해서·뇌가 한가해서, 걱정 고리(자동사고), 애쓸수록 도망가는 잠, 조건을 만들어 기다리기. 수면 위생·야간 전략은 없음", note: "인계 문서에는 5/11 중단으로 적혀 있으나 이후 업스케일 완성본이 있어 '완성'으로 보고 계획함. 다르면 7주차 첫 화면을 상세로 바꾸면 됨" },
    { id: "W8-A", title: "초대받지 않은 손님", file: "W8A_통합본.mp4", dur: "3분 13초", covers: "잔치의 손님 비유, 싸움 대신 내 잔치, 생각은 구름, 이명 환자보다 큰 사람, 가치 질문(손주·나들이), 오늘부터 작은 행동. 도구상자·파도·위기 카드는 없음" },
  ],
  coverage: {
    week1_psychoeducation: { drama: "W1-A", mode: "요약", note: "세 화면 모두 영상에 있음. 앱 사용법(소리로 듣기, 다섯 탭, 고리 그림)만 상세" },
    week1_worksheet: { drama: "—", mode: "상세", note: "누적형 워크시트 첫 경험. 칸 4개 예시 타이핑, 저장 뒤 기록, 수정·삭제, 다시 들어가기, 기록 탭" },
    week1_homework: { drama: "—", mode: "상세", note: "일기 탭 사용법 전체(숫자 고르기, 체크, 계기·메모, 저장, 지난 기록, 전날 쓰기), 소리 탭" },
    week1_summary: { drama: "W1-A", mode: "요약", note: "숙제 한 줄만 읽음" },
    week2_psychoeducation: { drama: "W2-A", mode: "혼합", note: "첫 화면 요약. 파국적 사고 5가지 이름과 공통점, 사고기록지 원리·요령은 영상에 없어 상세" },
    week2_worksheet: { drama: "—", mode: "상세", note: "사고기록지 칸 4개, 누적 저장, 수정·삭제, 기록 탭" },
    week2_homework: { drama: "—", mode: "상세", note: "주 3회 요령, 워크시트 다시 열어 이어 쓰기" },
    week2_summary: { drama: "W2-A", mode: "요약" },
    week3_psychoeducation: { drama: "W3-A", mode: "요약", note: "영상은 '손전등', 앱은 '스포트라이트' — 같은 뜻임을 한마디" },
    week3_training: { drama: "—", mode: "상세", note: "호흡 방법 5단계, 호흡 원 도구(시작, 자동 체크), 이명이 들려도 괜찮다, 오해 두 가지" },
    week3_homework: { drama: "—", mode: "상세", note: "일기의 마음챙김 체크와 메모" },
    week3_summary: { drama: "W3-A", mode: "요약" },
    week4_safety: { drama: "W4-A", mode: "요약", note: "청각과민 언급만 한마디 추가" },
    week4_psychoeducation: { drama: "W4-B", mode: "요약" },
    week4_worksheet: { drama: "—", mode: "상세", note: "실험 전 1~3번 저장 → 실행 후 '수정'으로 4~5번 채우기(두 단계). 기록 탭" },
    week4_homework: { drama: "—", mode: "상세" },
    week4_summary: { drama: "W4-A/B", mode: "요약" },
    week5_psychoeducation: { drama: "W5-A", mode: "요약" },
    week5_training: { drama: "—", mode: "상세", note: "준비, 기본 동작, 호흡, 14부위 순서, 타이머 도구(시작, 자동 체크)" },
    week5_homework: { drama: "—", mode: "상세", note: "전후 긴장도를 일기 메모에 적는 예시" },
    week5_summary: { drama: "W5-A", mode: "요약" },
    week6_psychoeducation: { drama: "W6-A", mode: "혼합", note: "첫 화면 요약. 축약 이완 3단계와 어깨·턱·이마, 호흡–단서어 도구는 상세" },
    week6_worksheet: { drama: "—", mode: "상세", note: "단일형 워크시트 첫 경험. 저장하고 다음 → 다시 열면 채워져 있음 → 적용 기록 덧붙이기" },
    week6_homework: { drama: "—", mode: "상세" },
    week6_summary: { drama: "W6-A", mode: "요약" },
    week7_psychoeducation: { drama: "W7-A", mode: "혼합", note: "첫 화면 요약. 수면 위생, 야간 전략(밤 그림)은 상세" },
    week7_worksheet: { drama: "—", mode: "상세", note: "취침 루틴 4칸, 단일형 저장·수정" },
    week7_homework: { drama: "—", mode: "상세", note: "수면일기는 일기 탭의 '수면 영향' 점수 + 메모란" },
    week7_summary: { drama: "W7-A", mode: "요약" },
    week8_act: { drama: "W8-A", mode: "혼합", note: "두 화면 요약. 가치·전념 행동 워크시트는 상세" },
    week8_psychoeducation: { drama: "—", mode: "상세", note: "도구상자 6묶음, 재발이 아니라 파도" },
    week8_worksheet: { drama: "—", mode: "상세", note: "위기 대응 카드 4칸, 언제든 다시 열기" },
    week8_summary: { drama: "—", mode: "상세", note: "이후 일정(4주·12주 추적, 2주 이상 어려움 연락). 설문 재작성 언급 없음(앱에서 제거됨)" },
  },
  // 제작 전 준비(렌더러 보완) — 대본에 새 장면이 들어 있어, 렌더 전에 Phone.tsx 에 아래를 추가해야 한다
  prep: [
    "Phone.tsx 에 view=today(일기 화면: 0~10 숫자 줄 3개, 체크 2개, 계기·메모 입력, 저장 버튼, 전날/다음 날 이동) 추가. state.values 로 고른 숫자·체크·메모를 표시",
    "Phone.tsx 에 view=records(기록 화면: 워크시트 묶음 + '열어서 고치기', 일기 표 + 날짜·'고치기') 추가. state.diary / state.worksheets 로 표시할 예시 기록 전달",
    "Phone.tsx 에 view=sound(소리 화면: 소리 목록, 재생 시간, 최근 사용 기록) 추가",
    "단일형 워크시트 저장 뒤 상태: state.single(칸 내용) + state.savedAt → 칸이 채워진 채 '저장됨 · 시각' 줄(#single-saved) 표시",
    "누적형 워크시트 '수정' 중 상태: state.editing=0 → 첫 기록 내용이 칸에 채워지고 버튼이 '수정한 내용 저장'",
    "실습 도구 정지 화면: 3주차 호흡 원(#breath), 5주차 근육이완 타이머(#pmr), 6주차 호흡–단서어(#breath) — 지금 렌더러는 악순환 고리 그림만 그림",
    "scripts/week1_assessment.json, week8_assessment.json 삭제 (설문 모듈은 앱에서 뺐음)",
    "public/audio/generated/week1_*/ 의 옛 파일럿 TTS(manifest.json)는 큐 id가 v2와 맞지 않음 — 육성 파일을 넣기 전에는 npm run index / studio 를 돌리지 말고, 넣은 뒤 node tools/tts.mjs 로 manifest 를 새로 만든다 (옛 폴더는 지워도 됨)",
    "육성 파일 누락 검사: node tools/check_voice.mjs (public/audio/voice/<모듈>/<큐id>.* 가 없는 큐 목록)",
  ],
  workflow: [
    "이 문서와 scripts/*.json(대본 편집기 http://localhost:8091 에서 같은 내용을 보고 고칠 수 있음)을 검토·수정",
    "큐마다 육성 TTS 파일을 만들어 video/public/audio/voice/<모듈id>/<큐id>.wav (또는 mp3, m4a) 로 저장. 파일 이름이 곧 큐 id",
    "같은 문장은 한 번만 만들어 복사해도 됨(예: 반복 학습 안내 문장, '아래 다음 버튼을 눌러…')",
    "node tools/check_voice.mjs 로 빠진 큐 확인 → node tools/tts.mjs <모듈> (육성이 있으면 그것을 쓰고 길이만 잰다) → npm run index",
    "렌더러 준비 항목을 마친 뒤 npm run studio 로 확인, npx remotion render <모듈-id> out/<모듈>.mp4",
  ],
};

// ---------------------------------------------------------------- 공용 장면
const K = (m) => `[data-mod="${m.id}"]`;

// 누적형 워크시트: 저장 뒤 → 다시 들어가기 → 기록 탭
function appendAfter(b, idx, responses, firstKey) {
  b.scene(idx, "module", { afterSave: true, entries: [{ when: "오늘", responses }] }, (t) => {
    t.x(`a${idx}-saved`, "저장하면 방금 쓴 내용이 아래에 기록으로 남고, 입력칸은 비워집니다.", { point: "#entries .entry" });
    t.x(`a${idx}-edit`, "기록 옆의 '수정'을 누르면 다시 고쳐 쓸 수 있고, '삭제'로 지울 수도 있습니다.", { point: "[data-edit]", tap: true });
    t.x(`a${idx}-more`, "더 적고 싶으면 빈 칸에 새로 적고 다시 저장하면 기록이 하나 더 쌓입니다.", { point: t.fieldSel(firstKey) });
    t.x(`a${idx}-next`, "칸이 비어 있으면 아래 버튼이 '다음으로'로 바뀝니다. 눌러서 다음 내용으로 넘어갑니다.", { point: "#next-btn", tap: true });
  });
}
// 단일형 워크시트: 저장 뒤 화면
function singleAfter(b, idx, responses, extraCues) {
  b.scene(idx, "module", { single: responses, savedAt: "오늘" }, (t) => {
    t.x(`a${idx}-saved`, "저장하면 적은 내용이 그대로 남고, 칸 아래에 '저장됨'과 저장한 시각이 표시됩니다.", { point: "#single-saved" });
    t.x(`a${idx}-edit`, "고치고 싶으면 칸의 글을 바로 고친 뒤 같은 버튼을 다시 누르면 됩니다. 그러면 새 내용으로 바뀝니다.", { point: t.fieldSel(t.fields[0].key) });
    if (extraCues) extraCues(t);
  });
}
// 프로그램 목록에서 다시 들어가기 → 기록 탭
function reopen(b, idx, { single = false, records = "ws" } = {}) {
  const m = b.m;
  b.scene(idx, "program", null, (t) => {
    t.x(`p${idx}-open`, `나중에 다시 쓰고 싶으면 '프로그램' 탭에서 ${m.week}주차의 '${m.title}'을 다시 엽니다.`, { point: K(m), tap: true });
    t.x(`p${idx}-list`, single ? "다시 열면 전에 적은 내용이 그대로 채워져 있습니다. 고친 뒤 다시 저장하면 새 내용으로 바뀝니다." : "이미 쓴 기록은 그 화면 아래에 모여 있고, 새로 적어 저장하면 하나 더 쌓입니다.");
  });
  b.scene(idx, "records", { worksheets: [m.id] }, (t) => {
    t.x(`r${idx}-tab`, "'기록' 탭을 누르면 지금까지 쓴 기록을 한꺼번에 볼 수 있습니다.", { point: '[data-route="records"]', tap: true });
    t.x(`r${idx}-ws`, "워크시트 기록은 모듈 이름 아래에 모여 있습니다. '열어서 고치기'를 누르면 그 화면으로 바로 갑니다.", { point: "#records .ws a.more" });
  });
}

export const PLAN = {
  // ================================================================ 1주차
  week1_psychoeducation(b) {
    b.screen(0, (t) => {
      t.intro();
      t.raw("tts1", "글을 읽기 힘들 때는 제목 아래 '소리로 듣기' 버튼을 누르세요. 화면의 글을 읽어 줍니다.", { point: "#tts-btn", tap: true });
      t.raw("tts2", "한 번 더 누르면 읽기를 멈춥니다. 모든 화면에 같은 버튼이 있습니다.", { point: "#tts-btn" });
      t.raw("nav0", "화면 맨 위에는 탭이 다섯 개 있습니다. 홈, 프로그램, 일기, 소리, 기록입니다.", { point: '[data-route="home"]' });
      t.raw("nav1", "프로그램 탭에는 팔 주 동안의 내용이 주차별로 있습니다. 다음 주차는 칠 일마다 자동으로 열립니다.", { point: '[data-route="program"]' });
      t.raw("nav2", "일기 탭에서는 매일 일 분 일기를 씁니다. 방법은 이번 주 숙제에서 설명합니다.", { point: '[data-route="today"]' });
      t.raw("nav3", "소리 탭은 클리닉에서 안내한 소리 치료를 트는 곳입니다.", { point: '[data-route="sound"]' });
      t.raw("nav4", "기록 탭에서는 지금까지 쓴 일기와 워크시트를 한꺼번에 볼 수 있습니다.", { point: '[data-route="records"]' });
      t.skim("이 화면에는 프로그램의 목표와 진행 방식이 적혀 있습니다. 이명을 없애는 것이 아니라 이명에 대한 반응을 바꾸는 것이 목표라는 내용입니다.");
      t.read("하루 10~15분");
      t.next();
    });
    b.screen(1, (t) => {
      t.skim("왜 이명이 어떤 날은 더 크게 느껴지는지, 악순환 고리를 설명하는 화면입니다. 영상에서 보신 흐름이 여섯 단계로 적혀 있습니다.");
      t.raw("cyc1", "본문 아래에는 이 고리를 그림으로 보여 주는 '한눈에 보기'가 있습니다.", { point: "#extra" });
      t.raw("cyc2", "소리에서 생각, 감정, 몸의 긴장으로 이어지고 다시 소리로 돌아오는 고리가 세 번 돌아갑니다.", { point: "#extra" });
      t.read("중요한 점은");
      t.next();
    });
    b.screen(2, (t) => {
      t.skim("이명이 있어도 청각계가 계속 나빠지는 것은 아니라는 안심 정보입니다.");
      t.raw("again", "불안해질 때마다 이 화면을 다시 열어 읽어 보세요.");
      t.next("여기까지 읽었으면 아래 '완료' 버튼을 누릅니다. 완료 표시가 남고, 다음 내용으로 이어집니다.");
    });
  },

  week1_worksheet(b) {
    const ex = { trigger_situation: "조용한 방에서 잠들려 할 때", automatic_thought: "이러다 잠을 못 자겠다", emotion: "불안, 짜증", body_reaction: "어깨가 긴장되고 귀에 더 집중하게 됨" };
    b.screen(0, (t) => {
      t.intro();
      t.raw("why", "앞 화면에서 본 악순환 고리를 이번에는 나의 경험으로 채워 보는 워크시트입니다.");
      t.readAll();
      t.raw("how", "칸은 네 개입니다. 칸을 누르면 글을 쓸 수 있고, 다 쓰지 않고 나가도 쓰던 글은 그대로 남습니다.");
      t.field(0, { example: ex.trigger_situation });
      t.field(1, { example: ex.automatic_thought });
      t.field(2, { example: ex.emotion });
      t.field(3, { example: ex.body_reaction });
      t.save();
    }, { image: img("concept-cycle.webp", "1주차 악순환 고리 화면·워크시트 (기존 프롬프트 문서 B 참조, 아직 생성 안 됨)", "A circular diagram made of six small abstract icons connected by thin ink arrows into a loop: a small sound mark (three arcs), a thought cloud, a heart with a tremble line, a tense shoulder shape, a larger sound mark, and back to the start. No labels, no numbers. One arrow is terracotta to show the loop can be cut there. Centered on cream, square composition.") });
    appendAfter(b, 0, ex, "trigger_situation");
    reopen(b, 0);
  },

  week1_homework(b) {
    b.screen(0, (t) => {
      t.intro();
      t.readAll();
      t.raw("go", "이제 일기 탭으로 가서 실제로 어떻게 쓰는지 보겠습니다.", { point: '[data-route="today"]', tap: true });
    });
    b.scene(0, "today", { values: { tinnitus: 6, annoyance: 7, sleep: 3 }, trigger: "시끄러운 카페에 다녀옴", memo: "" }, (t) => {
      t.x("d0-open", "일기 탭을 누르면 오늘의 일기 화면이 열립니다. 위에 오늘 날짜가 보입니다.", { point: ".hero .eyebrow" });
      t.x("d0-num", "숫자 줄이 세 개 있습니다. 영에서 십까지 숫자 가운데 하나를 눌러 고릅니다.", { point: "#sl-tinnitus .scale" });
      t.x("d0-t", "첫 줄은 오늘 이명의 크기입니다. 영은 거의 안 들림, 십은 매우 큼입니다. 예를 들어 육을 누릅니다.", { point: '#sl-tinnitus button[data-v="6"]', tap: true });
      t.x("d0-a", "둘째 줄은 오늘 이명이 신경 쓰인 정도입니다. 예를 들어 칠을 누릅니다.", { point: '#sl-annoyance button[data-v="7"]', tap: true });
      t.x("d0-s", "셋째 줄은 간밤 수면에 미친 영향입니다. 이명이 잠드는 것을 얼마나 방해했는지 고릅니다. 예를 들어 삼입니다.", { point: '#sl-sleep button[data-v="3"]', tap: true });
      t.x("d0-chk", "그 아래 두 개의 체크는 삼 주차와 오 주차에 배울 마음챙김 호흡과 근육이완을 한 날 표시하는 칸입니다. 지금은 비워 두세요.", { point: "#in-mindfulness" });
      t.x("d0-trg", "이명이 더 심해진 계기는 선택 사항입니다. 시끄러운 곳, 피로, 커피처럼 짧게 적습니다.", { point: "#in-trigger" });
      t.x("d0-memo", "메모란에는 오늘 느낀 점을 자유롭게 적습니다. 앞으로 연습한 내용도 여기에 적게 됩니다.", { point: "#in-memo" });
      t.x("d0-save", "다 골랐으면 아래 '저장' 버튼을 누릅니다. 일 분이면 충분합니다.", { point: "#diary-form button[type=submit]", tap: true });
      t.x("d0-saved", "저장하면 아래에 마지막 저장 시각이 표시됩니다. 같은 날 다시 열어 고치고 저장하면 새 내용으로 바뀝니다.", { point: "#diary-status" });
      t.x("d0-prev", "빠뜨린 날이 있으면 위의 '전날' 버튼으로 날짜를 옮겨 지난 날 일기를 쓸 수 있습니다.", { point: ".date-nav a:first-child" });
      t.x("d0-time", "매일 같은 시간, 예를 들어 자기 전에 쓰는 습관을 들이면 훨씬 수월합니다.");
    });
    b.scene(0, "records", { diary: [
      { date: "오늘", tinnitus: 6, annoyance: 7, sleep: 3, memo: "시끄러운 카페에 다녀옴" },
      { date: "어제", tinnitus: 5, annoyance: 5, sleep: 4, memo: "" },
      { date: "2일 전", tinnitus: 7, annoyance: 6, sleep: 5, memo: "피로" },
      { date: "3일 전", tinnitus: 4, annoyance: 3, sleep: 2, memo: "" },
      { date: "4일 전", tinnitus: 6, annoyance: 6, sleep: 4, memo: "커피" },
    ] }, (t) => {
      t.x("r0-tab", "쓴 일기는 '기록' 탭에서 볼 수 있습니다.", { point: '[data-route="records"]', tap: true });
      t.x("r0-chart", "일기가 쌓이면 이명 크기와 신경 쓰인 정도가 그래프로 보입니다. 나만의 흐름을 볼 수 있습니다.", { point: "#records .chart" });
      t.x("r0-table", "아래 표에는 날짜별 점수가 있습니다. 날짜나 '고치기'를 누르면 그날 일기를 다시 열어 고칠 수 있습니다.", { point: "#records table tbody tr:first-child" });
    });
    b.scene(0, "sound", null, (t) => {
      t.x("n0-tab", "클리닉에서 소리 치료를 안내받으셨다면 '소리' 탭에서 재생합니다.", { point: '[data-route="sound"]', tap: true });
      t.x("n0-play", "소리를 고르고 누르면 재생되고, 사용 시간이 자동으로 기록됩니다. 밤 열 시부터 아침 여섯 시 사이 사용은 야간으로 따로 기록됩니다.", { point: ".sound-item" });
      t.x("n0-back", "이제 프로그램으로 돌아가 이번 주 정리를 보겠습니다.", { point: '[data-route="program"]', tap: true });
    }, { image: img("concept-diary.webp", "1주차 숙제(일기 시작) 화면 위", "A small open notebook page drawn in a few ink lines, with three short horizontal scales sketched on it (each a thin line with a small terracotta dot placed somewhere along it). Beside the notebook, a simple bedside lamp turned low and a cup, suggesting 'before sleep'. Everything else empty cream. Concept: one minute a day, three quick marks.") });
  },

  week1_summary(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("첫 주에 배운 세 가지를 정리한 화면입니다. 반응이 고통을 좌우한다는 것, 악순환 고리, 그리고 안심 정보입니다.");
      t.read("다음 주에는", "이번 주 남은 숙제");
      t.next("'홈으로' 버튼을 누르면 첫 주가 끝나고 홈 화면으로 돌아갑니다.");
    });
  },

  // ================================================================ 2주차
  week2_psychoeducation(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("이명 소리와 괴로움 사이에 끼어 있는 '생각', 그리고 자동사고가 무엇인지 설명하는 화면입니다.");
      t.next();
    });
    b.screen(1, (t) => {
      t.raw("lead", "이 화면은 영상에서 짧게만 다룬 부분이라 자세히 보겠습니다. 이명이 있는 분들에게 자주 나타나는 다섯 가지 생각 습관입니다.");
      t.readAll();
      t.next();
    });
    b.screen(2, (t) => {
      t.raw("lead", "영상에서 '이어서 방법을 알려드리겠다'고 한 바로 그 내용입니다. 사고기록지가 무엇이고 어떻게 쓰는지 자세히 보겠습니다.");
      t.readAll();
      t.next();
    }, { image: img("concept-thought-record.webp", "2주차 '사고기록지 — 생각을 붙잡는 도구' 화면", "A faint, smoky thought-cloud drifting above a simplified seated figure. One thin ink line reaches up from a small sheet of paper on the table and 'pins' the cloud down onto the page, where it becomes a single clean, straight line of ink. A little gap of empty space between the figure and the paper suggests distance. Terracotta only on the pinned line. Concept: writing a thought down fixes it, makes it inspectable, and puts distance between you and it.") });
  },

  week2_worksheet(b) {
    const ex = { situation: "밤 11시, 침대에 누워 잠들려던 참", automatic_thought: "오늘도 이 소리 때문에 못 자겠다. 내일 완전히 망가지겠지", emotion_intensity: "불안 7, 짜증 5", pattern_found: "최악을 예상하기 — 아직 일어나지 않은 내일 일을 확정처럼 생각함" };
    b.screen(0, (t) => {
      t.intro();
      t.readAll();
      t.field(0, { example: ex.situation, exampleSay: "예를 들면 이렇게 적을 수 있습니다. 밤 열한 시, 침대에 누워 잠들려던 참." });
      t.field(1, { example: ex.automatic_thought, exampleSay: "머리를 스친 말을 그대로 적습니다. 오늘도 이 소리 때문에 못 자겠다. 내일 완전히 망가지겠지." });
      t.field(2, { example: ex.emotion_intensity, exampleSay: "감정에 이름을 붙이고 영에서 십으로 강도를 적습니다. 불안 칠, 짜증 오." });
      t.field(3, { example: ex.pattern_found, exampleSay: "앞 화면의 다섯 가지 가운데 맞는 것을 고릅니다. 최악을 예상하기, 아직 일어나지 않은 내일 일을 확정처럼 생각함." });
      t.save();
    });
    appendAfter(b, 0, ex, "situation");
    reopen(b, 0);
  },

  week2_homework(b) {
    b.screen(0, (t) => {
      t.intro();
      t.readAll();
      t.raw("where", "정리하면, 사고기록지는 프로그램 탭에서 '사고기록지 연습'을 다시 열어 쓰고, 쓴 기록은 그 화면 아래와 기록 탭에서 봅니다.");
      t.next();
    });
  },

  week2_summary(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("둘째 주에 배운 내용을 정리한 화면입니다. 생각이 끼어 있다는 것, 자동사고, 파국적 사고 패턴, 사고기록지입니다.");
      t.read("이번 주 숙제", "다음 주에는");
      t.next("'홈으로' 버튼을 누르면 둘째 주가 끝납니다.");
    });
  },

  // ================================================================ 3주차
  week3_psychoeducation(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("주의는 한 번에 한 곳만 비출 수 있다는 스포트라이트 이야기입니다. 영상에서는 손전등이라고 했지요. 같은 뜻입니다.");
      t.next();
    });
    b.screen(1, (t) => {
      t.skim("이명을 밀어내는 것이 아니라 주의를 부드럽게 옮기는 방법입니다. 흰곰 이야기, 세 단계, 반복이 근육이라는 내용이 있습니다.");
      t.raw("bridge", "다음 모듈에서 이 훈련의 도구인 마음챙김 호흡 방법을 자세히 배웁니다.");
      t.next();
    });
  },

  week3_training(b) {
    b.screen(0, (t) => {
      t.intro();
      t.raw("lead", "영상에서는 원리만 다루었고, 실제 호흡 방법은 이 화면에 있습니다. 순서대로 자세히 보겠습니다.");
      t.readAll();
      t.raw("tool1", "본문 아래에 '지금 바로 연습하기'가 있습니다. 원이 커질 때 들이쉬고, 작아질 때 내쉽니다.", { point: "#breath" });
      t.raw("tool2", "'시작'을 누르면 원이 움직이기 시작하고, 정한 시간이 끝나면 멈춥니다.", { point: "#breath .btn", tap: true });
      t.raw("tool3", "연습을 마치면 오늘 일기에 '마음챙김' 체크가 자동으로 표시됩니다. 따로 적지 않아도 됩니다.");
      t.next();
    }, { image: img("concept-breath.webp", "3주차 마음챙김 호흡 방법 화면 (호흡 원 도구 옆)", "Concentric gentle rings, like ripples, drawn with thin ink lines around a small central circle. A simplified seated figure with an upright back sits beside them, eyes suggested closed by two short lines. Off in the dim margin, a tiny ringing-sound mark (three short arcs) is left alone, unlit. Terracotta only on the innermost ring. Concept: attention rests on the breath; the sound is allowed to be there.") });
    b.screen(1, (t) => {
      t.readAll();
      t.next();
    });
  },

  week3_homework(b) {
    b.screen(0, (t) => {
      t.intro();
      t.readAll();
      t.raw("go", "일기에서 어디에 표시하는지 보겠습니다.", { point: '[data-route="today"]', tap: true });
    });
    b.scene(0, "today", { values: { tinnitus: 5, annoyance: 5, sleep: 3 }, mindfulness: true, memo: "마음챙김 10분, 중간에 이명으로 3번 주의가 갔지만 돌아옴" }, (t) => {
      t.x("d0-chk", "일기 화면의 '마음챙김 호흡을 했어요' 체크입니다. 호흡 원 도구로 연습했으면 자동으로 체크되고, 따로 했으면 직접 누릅니다.", { point: "#in-mindfulness", tap: true });
      t.x("d0-memo", "메모란에 한 줄 적습니다. 예를 들어, 마음챙김 십 분, 중간에 이명으로 세 번 주의가 갔지만 돌아옴.", { point: "#in-memo" });
      t.x("d0-save", "저장을 누르면 됩니다. 기록 탭의 표에서 '실습' 칸에 마음챙김이 표시됩니다.", { point: "#diary-form button[type=submit]", tap: true });
    });
  },

  week3_summary(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("셋째 주 정리입니다. 주의는 유한하다는 것, 억누르지 않고 옮기는 것, 마음챙김 호흡입니다.");
      t.read("이번 주 숙제", "다음 주에는");
      t.next("'홈으로' 버튼을 누르면 셋째 주가 끝납니다.");
    });
  },

  // ================================================================ 4주차
  week4_safety(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("나를 지키려는 안전행동 네 가지를 설명하는 화면입니다. 귀마개, 소리 크게 덮기, 이명 확인, 활동 줄이기입니다.");
      t.next();
    });
    b.screen(1, (t) => {
      t.skim("안전행동을 반복하면 뇌가 이명을 위험 신호로 잘못 배운다는 내용입니다. 조용한 곳에서 확인하기와 소리 크게 틀기를 특히 조심하라고 합니다.");
      t.raw("hyper", "한 가지 덧붙이면, 심한 경우 작은 생활 소음에도 불편을 느끼는 청각과민으로 이어질 수 있다는 설명도 있습니다.");
      t.next();
    });
    b.screen(2, (t) => {
      t.skim("안전행동을 무작정 끊지 않고 작은 실험으로 확인한다는 내용입니다. 영상 마지막 부분에서 보셨습니다.");
      t.next();
    });
  },

  week4_psychoeducation(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("'이명 때문에 무엇을 못 한다'는 믿음이 피하게 만들고, 피할수록 믿음이 굳어진다는 화면입니다. 찻집 모임 영상에서 보셨습니다.");
      t.next();
    });
    b.screen(1, (t) => {
      t.skim("행동실험의 순서를 정리한 화면입니다. 믿음 고르기, 예측 적기, 해 보기, 결과 적기, 비교하기의 다섯 단계입니다.");
      t.raw("tip", "처음에는 피하고 있었지만 조금 아쉬웠던 활동부터 고르라는 요령과, 실험에 실패는 없다는 말을 기억해 주세요.");
      t.next();
    });
  },

  week4_worksheet(b) {
    const ex = { belief: "이명 때문에 조용한 카페에서 책을 못 읽는다", prediction: "소리에만 신경 쓰여서 5분도 못 읽고 나올 것이다 (확신 80%)", experiment_plan: "토요일 오후, 집 근처 카페에서 30분 책 읽기" };
    const done = { ...ex, actual_result: "처음 10분은 거슬렸지만 책에 빠지자 잊었고 40분을 읽었다", learning: "생각보다 할 수 있었다. 확신도 80% → 40%" };
    b.screen(0, (t) => {
      t.intro();
      t.readAll();
      t.raw("two", "이 워크시트는 두 번에 나누어 씁니다. 실험 전에 첫째부터 셋째 칸을 적어 저장하고, 실험을 다녀온 뒤 다시 열어 넷째와 다섯째 칸을 채웁니다.");
      t.field(0, { example: ex.belief });
      t.field(1, { example: ex.prediction, exampleSay: "예측과 함께 얼마나 확신하는지 퍼센트로 적습니다. 소리에만 신경 쓰여서 오 분도 못 읽고 나올 것이다, 확신 팔십 퍼센트." });
      t.field(2, { example: ex.experiment_plan, exampleSay: "언제, 어디서, 무엇을 할지 정합니다. 토요일 오후, 집 근처 카페에서 삼십 분 책 읽기." });
      t.raw("later", "넷째와 다섯째 칸은 지금 비워 둡니다. 실험을 한 뒤에 채웁니다.", { point: t.fieldSel("actual_result") });
      t.save("여기까지 적었으면 아래 '기록 저장' 버튼을 누릅니다.");
    });
    b.scene(0, "module", { afterSave: true, entries: [{ when: "오늘", responses: ex }] }, (t) => {
      t.x("a0-saved", "저장하면 실험 계획이 아래에 기록으로 남습니다.", { point: "#entries .entry" });
      t.x("a0-back", "실험을 다녀온 뒤에는 프로그램 탭에서 이 워크시트를 다시 열고, 기록 옆의 '수정'을 누릅니다.", { point: "[data-edit]", tap: true });
    });
    b.scene(0, "module", { editing: 0, entries: [{ when: "오늘", responses: ex }] }, (t) => {
      t.x("e0-fill", "수정을 누르면 적어 둔 내용이 칸에 다시 채워집니다. 이제 넷째 칸, 실제 결과를 적습니다.", { point: t.fieldSel("actual_result") });
      t.x("e0-r", "예를 들어, 처음 십 분은 거슬렸지만 책에 빠지자 잊었고 사십 분을 읽었다.", { type: { key: "actual_result", text: done.actual_result } });
      t.x("e0-l", "다섯째 칸에는 배운 점과 지금의 확신도를 적습니다. 생각보다 할 수 있었다. 확신도 팔십 퍼센트에서 사십 퍼센트.", { type: { key: "learning", text: done.learning } });
      t.x("e0-save", "버튼이 '수정한 내용 저장'으로 바뀌어 있습니다. 누르면 한 실험이 한 기록에 모입니다.", { point: "#next-btn", tap: true });
      t.x("e0-new", "새 실험은 빈 칸에 새로 적고 저장하면 기록이 하나 더 쌓입니다.", { point: t.fieldSel("belief") });
    });
    reopen(b, 0);
  },

  week4_homework(b) {
    b.screen(0, (t) => {
      t.intro();
      t.readAll();
      t.next();
    });
  },

  week4_summary(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("넷째 주 정리입니다. 안전행동, 회피와 믿음, 행동실험의 순서, 실패는 없다는 것입니다.");
      t.read("이번 주 숙제", "프로그램 절반에");
      t.next("'홈으로' 버튼을 누르면 넷째 주가 끝납니다.");
    });
  },

  // ================================================================ 5주차
  week5_psychoeducation(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("스트레스가 몸을 경계 태세로 만들고 귀를 예민하게 해서 이명이 크게 느껴지는 고리를 설명하는 화면입니다. 큰아이와 다툰 날 이야기에서 보셨습니다.");
      t.next();
    });
    b.screen(1, (t) => {
      t.skim("이완인데 왜 먼저 힘을 주는지, 대비 효과와 감각 학습을 설명하는 화면입니다. 주먹을 쥐었다 펴는 이야기에서 보셨습니다.");
      t.raw("bridge", "다음 모듈에서 실제 전신 순서와 도구를 자세히 배웁니다.");
      t.next();
    });
  },

  week5_training(b) {
    b.screen(0, (t) => {
      t.intro();
      t.raw("lead", "영상에서는 원리만 다루었고, 실제 방법은 이 화면과 다음 화면에 있습니다. 자세히 보겠습니다.");
      t.readAll();
      t.next();
    });
    b.screen(1, (t) => {
      t.raw("lead", "이제 전신 순서입니다. 팔에서 시작해 얼굴, 몸통, 다리로 내려갑니다. 모두 열네 부위입니다.");
      t.readAll();
      t.raw("tool1", "본문 아래 '안내에 따라 해보기'에서 '시작'을 누르면 부위마다 긴장과 이완 시간을 세어 줍니다.", { point: "#pmr .btn", tap: true });
      t.raw("tool2", "화면에 지금 어느 부위인지, 힘을 줄 때인지 풀 때인지가 크게 표시됩니다. 소리로 듣기와 함께 쓰면 눈을 감고도 할 수 있습니다.", { point: "#pmr" });
      t.raw("tool3", "끝까지 마치면 오늘 일기에 '근육이완' 체크가 자동으로 표시됩니다.");
      t.next();
    }, { image: img("concept-pmr-body.webp", "5주차 근육이완 전신 순서 화면", "A simplified standing human outline drawn with one continuous thin ink line, front view, no face. Along the body, fourteen small terracotta dots mark the sequence points: both hands, both upper arms, forehead, eyes, jaw, shoulders, chest, belly, both thighs, both calves. A faint dotted ink path connects the dots from the right hand down to the left foot, suggesting order. Lots of cream space. Concept: tense and release, one part at a time, top to bottom.") });
  },

  week5_homework(b) {
    b.screen(0, (t) => {
      t.intro();
      t.readAll();
      t.raw("go", "일기 메모란에 어떻게 적는지 보겠습니다.", { point: '[data-route="today"]', tap: true });
    });
    b.scene(0, "today", { values: { tinnitus: 5, annoyance: 4, sleep: 3 }, pmr: true, memo: "PMR 20분, 긴장도 7 → 3" }, (t) => {
      t.x("d0-chk", "타이머 도구로 마쳤으면 '근육이완을 했어요'가 자동으로 체크되어 있습니다. 따로 했으면 직접 누릅니다.", { point: "#in-pmr", tap: true });
      t.x("d0-memo", "메모란에 전후 점수를 적습니다. 예를 들어, 피엠알 이십 분, 긴장도 칠에서 삼.", { point: "#in-memo" });
      t.x("d0-save", "저장하면 기록 탭의 표에 '근육이완'과 메모가 함께 남아 다음 진료 때 함께 볼 수 있습니다.", { point: "#diary-form button[type=submit]", tap: true });
    });
  },

  week5_summary(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("다섯째 주 정리입니다. 스트레스와 이명의 고리, 이완은 기술이라는 것, 근육이완의 원리와 열네 부위 순서입니다.");
      t.read("이번 주 숙제", "다음 주에는");
      t.next("'홈으로' 버튼을 누르면 다섯째 주가 끝납니다.");
    });
  },

  // ================================================================ 6주차
  week6_psychoeducation(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("긴 이완을 몇 초 만에 쓰는 응용이완법과 단서어의 원리를 설명하는 화면입니다. 파블로프의 개 이야기에서 보셨습니다.");
      t.next();
    });
    b.screen(1, (t) => {
      t.raw("lead", "영상에서 '이어서 세 단계를 안내하겠다'고 한 바로 그 내용입니다. 자세히 보겠습니다.");
      t.readAll();
      t.raw("tool1", "본문 아래에 '호흡, 단서어 연습' 도구가 있습니다. 삼 주차의 호흡 원과 같지만, 내쉴 때 나의 단서어가 화면에 표시됩니다.", { point: "#breath" });
      t.raw("tool2", "단서어는 다음 워크시트에서 정합니다. 정하고 나면 이 도구에 그 단어가 나타납니다.");
      t.next();
    }, { image: img("concept-three-spots.webp", "6주차 축약 이완 3단계 화면 (어깨·턱·이마)", "A simplified head-and-shoulders outline drawn with a single thin ink line, no facial features. Three small terracotta circles mark the forehead, the jaw, and the top of one shoulder. From the shoulder, a soft downward arrow (one short stroke) suggests 'let it drop'. A long thin exhale line trails away from the mouth area toward the right, thinning out. Empty cream elsewhere. Concept: the three places where tension hides; one long breath and a cue word.") });
  },

  week6_worksheet(b) {
    const ex = { cue_word: "편안", tension_spots: "어깨가 올라감, 이를 꽉 물게 됨", trigger_plan: "업무 중 이명이 거슬릴 때, 잠자리에서 깼을 때", application_log: "" };
    b.screen(0, (t) => {
      t.intro();
      t.readAll();
      t.raw("single", "이 워크시트는 앞의 것과 달리 기록이 쌓이지 않고 한 장을 계속 고쳐 쓰는 형식입니다.");
      t.field(0, { example: ex.cue_word, exampleSay: "짧은 단어 하나면 됩니다. 예를 들어, 편안." });
      t.field(1, { example: ex.tension_spots, exampleSay: "예를 들어, 어깨가 올라감, 이를 꽉 물게 됨." });
      t.field(2, { example: ex.trigger_plan, exampleSay: "예를 들어, 업무 중 이명이 거슬릴 때, 잠자리에서 깼을 때." });
      t.raw("f3", "넷째 칸, 적용 기록은 지금 비워 둡니다. 이번 주에 실제로 써 본 뒤 한 줄씩 덧붙입니다.", { point: t.fieldSel("application_log") });
      t.save();
    });
    singleAfter(b, 0, ex, (t) => {
      t.x("a0-cue", "단서어를 저장하면 앞 화면의 호흡 도구에 그 단어가 표시됩니다.");
    });
    b.scene(0, "module", { single: { ...ex, application_log: "화요일 회의 중 시도. 긴장 7→4, 이명에서 회의로 주의가 돌아옴" }, savedAt: "오늘" }, (t) => {
      t.x("l0-open", "실제 상황에서 축약 이완을 써 본 뒤에는 이 워크시트를 다시 열어 넷째 칸에 한 줄 덧붙입니다.", { point: t.fieldSel("application_log") });
      t.x("l0-ex", "예를 들어, 화요일 회의 중 시도. 긴장 칠에서 사, 이명에서 회의로 주의가 돌아옴.", { type: { key: "application_log", text: "화요일 회의 중 시도. 긴장 7→4, 이명에서 회의로 주의가 돌아옴" } });
      t.x("l0-save", "그리고 '저장하고 다음'을 다시 누릅니다. 시도할 때마다 이렇게 줄을 더해 갑니다.", { point: "#next-btn", tap: true });
    });
    reopen(b, 0, { single: true });
  },

  week6_homework(b) {
    b.screen(0, (t) => {
      t.intro();
      t.readAll();
      t.next();
    });
  },

  week6_summary(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("여섯째 주 정리입니다. 응용이완법, 단서어 짝짓기의 원리, 빠른 이완 세 단계입니다.");
      t.read("이번 주 숙제", "이제 낮의 도구는");
      t.next("'홈으로' 버튼을 누르면 여섯째 주가 끝납니다.");
    });
  },

  // ================================================================ 7주차
  week7_psychoeducation(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("밤에 이명이 더 크게 느껴지는 두 가지 이유와 걱정의 고리, 그리고 잠은 쫓아가는 것이 아니라 기다리는 것이라는 내용입니다.");
      t.next();
    });
    b.screen(1, (t) => {
      t.raw("lead", "수면 위생 원칙은 영상에 없던 내용이라 자세히 보겠습니다. 전부 한 번에 바꾸지 말고 두세 개만 고르라는 것이 첫 번째 원칙입니다.");
      t.readAll();
      t.next();
    }, { image: img("concept-sleep-hygiene.webp", "7주차 수면 위생 화면", "Four tiny vignettes arranged in a loose square, each drawn with a few ink strokes: a small alarm clock with a fixed hand, a bed drawn as one line with no screen or phone near it, a cup turned upside down, and a dimmed lamp with a soft sand glow. Between them, generous cream space. Terracotta only on the clock hand. Concept: the same wake-up time, bed for sleep only, no caffeine late, lights low before bed.") });
    b.screen(2, (t) => {
      t.raw("lead", "이명이 있는 분들을 위한 밤 전략 세 가지입니다. 영상에서는 다루지 않았으니 자세히 보겠습니다.");
      t.readAll();
      t.raw("img", "본문 아래 그림은 낮은 볼륨의 소리를 켜 두고 잠을 기다리는 모습입니다.", { point: ".concept" });
      t.next();
    });
  },

  week7_worksheet(b) {
    const ex = { target_times: "기상 6:30 고정, 취침 23:00~23:30", routine_steps: "22:00 조명 낮추고 화면 끄기 → 세면 → 스트레칭 → PMR 15분 → 사운드 켜고 눕기", night_sound_plan: "노치 사운드, 볼륨 15% (겨우 들릴 정도), 잠들기 10분 전부터", if_awake_plan: "축약 이완 1분 → 사운드 다시 켜기 → 20분 넘으면 거실에서 책 읽다가 졸리면 복귀" };
    b.screen(0, (t) => {
      t.intro();
      t.readAll();
      t.raw("single", "이 워크시트도 한 장을 계속 고쳐 쓰는 형식입니다. 오늘 밤부터 실제로 해 볼 계획을 구체적으로 적습니다.");
      t.field(0, { example: ex.target_times, exampleSay: "예를 들어, 기상 여섯 시 삼십 분 고정, 취침 밤 열한 시에서 열한 시 삼십 분." });
      t.field(1, { example: ex.routine_steps, exampleSay: "잠들기 전 삼십 분에서 한 시간의 순서입니다. 밤 열 시에 조명을 낮추고 화면 끄기, 세면, 스트레칭, 근육이완 십오 분, 사운드 켜고 눕기." });
      t.field(2, { example: ex.night_sound_plan, exampleSay: "예를 들어, 노치 사운드, 볼륨 십오 퍼센트, 겨우 들릴 정도, 잠들기 십 분 전부터." });
      t.field(3, { example: ex.if_awake_plan, exampleSay: "예를 들어, 축약 이완 일 분, 사운드 다시 켜기, 이십 분 넘으면 거실에서 책 읽다가 졸리면 복귀." });
      t.save();
    });
    singleAfter(b, 0, ex, (t) => {
      t.x("a0-adj", "한 주 해 보고 맞지 않는 부분은 다시 열어 고치면 됩니다. 다음 진료에서 선생님과 함께 조정하기도 합니다.");
    });
    reopen(b, 0, { single: true });
  },

  week7_homework(b) {
    b.screen(0, (t) => {
      t.intro();
      t.readAll();
      t.raw("go", "수면일기는 따로 있는 것이 아니라 매일 일기에 함께 적습니다. 일기 화면에서 보겠습니다.", { point: '[data-route="today"]', tap: true });
    });
    b.scene(0, "today", { values: { tinnitus: 5, annoyance: 4, sleep: 6 }, memo: "23:10 누움, 20분쯤 걸려 잠듦, 새벽 1회 깸 → 사운드 켜고 다시 잠, 컨디션 6/10" }, (t) => {
      t.x("d0-sleep", "셋째 줄, 간밤 수면에 미친 영향 점수를 아침마다 꼭 고릅니다.", { point: "#sl-sleep .scale", tap: true });
      t.x("d0-memo", "메모란에 수면일기를 적습니다. 누운 시간, 잠들기까지 걸린 대략의 시간, 밤에 깬 횟수, 아침 컨디션입니다.", { point: "#in-memo" });
      t.x("d0-ex", "예를 들어, 밤 열한 시 십 분에 누움, 이십 분쯤 걸려 잠듦, 새벽 한 번 깸, 사운드 켜고 다시 잠, 컨디션 십 점 만점에 육 점.", { point: "#in-memo" });
      t.x("d0-clock", "잠들기까지 걸린 시간은 시계를 보지 말고 느낌으로만 적습니다.");
      t.x("d0-save", "저장하면 됩니다. 야간 사운드는 소리 탭에서 재생만 하면 자동으로 야간 사용으로 기록됩니다.", { point: "#diary-form button[type=submit]", tap: true });
    });
    b.scene(0, "records", { diary: [{ date: "오늘", tinnitus: 5, annoyance: 4, sleep: 6, memo: "23:10 누움, 20분쯤 걸려 잠듦…" }] }, (t) => {
      t.x("r0-tab", "일주일 치가 쌓이면 기록 탭에서 수면 영향 점수의 흐름과 메모를 함께 볼 수 있습니다. 다음 진료 때 이 화면을 선생님과 같이 봅니다.", { point: '[data-route="records"]', tap: true });
    });
  },

  week7_summary(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("일곱째 주 정리입니다. 밤에 크게 느껴지는 이유, 잠은 기다리는 것, 수면 위생, 야간 전략입니다.");
      t.read("이번 주 숙제", "다음 주는 마지막");
      t.next("'홈으로' 버튼을 누르면 일곱째 주가 끝납니다.");
    });
  },

  // ================================================================ 8주차
  week8_act(b) {
    b.screen(0, (t) => {
      t.intro();
      t.skim("싸움을 멈추는 지혜, 수용전념이라는 관점입니다. 기꺼이 받아들이기, 생각과 거리 두기, 이명은 잠시 낀 구름이라는 내용입니다.");
      t.next();
    });
    b.screen(1, (t) => {
      t.skim("초대받지 않은 손님 비유입니다. 손님을 쫓아다니지 않고 내 잔치를 즐긴다는 이야기, 영상의 마지막 주 대화에서 보셨습니다.");
      t.next();
    });
    b.screen(2, (t) => {
      t.raw("lead", "영상에서 선생님이 물으셨던 질문을 이제 직접 적어 보는 워크시트입니다.");
      t.readAll();
      t.field(0, { example: "손주들과 즐겁게 시간을 보내는 할머니, 친구들과 나들이를 다니는 사람", exampleSay: "예를 들어, 손주들과 즐겁게 시간을 보내는 할머니, 친구들과 나들이를 다니는 사람." });
      t.field(1, { example: "이번 주 토요일 친구에게 전화해서 나들이 날짜 정하기", exampleSay: "이명이 들리는 지금, 이번 주에 시작할 작은 행동 하나입니다. 예를 들어, 이번 주 토요일 친구에게 전화해서 나들이 날짜 정하기." });
      t.save();
    });
    singleAfter(b, 2, { value_direction: "손주들과 즐겁게 시간을 보내는 할머니, 친구들과 나들이를 다니는 사람", committed_action: "이번 주 토요일 친구에게 전화해서 나들이 날짜 정하기" }, (t) => {
      t.x("a2-later", "프로그램이 끝난 뒤에도 이 화면을 다시 열어 새로운 행동으로 바꿔 적을 수 있습니다.");
    });
    reopen(b, 2, { single: true });
  },

  week8_psychoeducation(b) {
    b.screen(0, (t) => {
      t.intro();
      t.raw("lead", "팔 주 동안 배운 도구를 한자리에 모은 화면입니다. 영상에는 없던 정리이니 하나씩 자세히 보겠습니다.");
      t.readAll();
      t.next();
    }, { image: img("concept-toolbox.webp", "8주차 도구상자 화면", "An open wooden toolbox drawn with a few ink lines, seen slightly from above. Inside, six small abstract objects sit in a row, each a simple shape: a small loop (thoughts), a narrow light cone (attention), a single footprint (action), a soft wave line (body), a crescent moon (night), and a tiny distant tree (values). One extra small sound-wave mark rests beside the box (sound therapy). Terracotta only on the toolbox handle. Concept: pick the tool the moment needs; you don't use all of them at once.") });
    b.screen(1, (t) => {
      t.raw("lead", "마지막으로 아주 중요한 이야기, 재발이 아니라 파도입니다.");
      t.readAll();
      t.next();
    }, { image: img("concept-wave.webp", "8주차 '재발이 아니라 파도' 화면 (기존 프롬프트 문서 B 참조, 아직 생성 안 됨)", "One large ocean wave drawn as a single confident ink line: it rises steeply on the left, crests, and settles into a calm flat line on the right that continues to the edge. A tiny simplified figure stands on the calm part, looking back at the wave without fear. Terracotta accent only on the crest. Concept: a hard day is a wave; it always comes down.") });
  },

  week8_worksheet(b) {
    const ex = { warning_signs: "이명 체크가 잦아짐, 어깨가 굳음, 잠들기 걱정이 미리 듦", first_action: "축약 이완 1분 → 사운드 켜기 → 하던 일로 주의 옮기기", helpful_thoughts: "\"파도일 뿐, 내려간다\", \"소리는 같아도 내 반응은 내가 정한다\"", backup_plan: "PMR 매일로 복귀, 수면 루틴 재점검, 2주 이상이면 클리닉 연락" };
    b.screen(0, (t) => {
      t.intro();
      t.readAll();
      t.raw("why", "힘든 순간에는 생각이 잘 나지 않기 때문에 미리 적어 두는 카드입니다. 칸은 네 개입니다.");
      t.field(0, { example: ex.warning_signs, exampleSay: "예를 들어, 이명 체크가 잦아짐, 어깨가 굳음, 잠들기 걱정이 미리 듦." });
      t.field(1, { example: ex.first_action, exampleSay: "가장 먼저 할 일을 순서대로 구체적으로 적습니다. 축약 이완 일 분, 사운드 켜기, 하던 일로 주의 옮기기." });
      t.field(2, { example: ex.helpful_thoughts, exampleSay: "팔 주 가운데 가장 도움이 된 생각을 적습니다. 파도일 뿐, 내려간다. 소리는 같아도 내 반응은 내가 정한다." });
      t.field(3, { example: ex.backup_plan, exampleSay: "이삼 일 이상 이어질 때의 계획입니다. 근육이완 매일로 복귀, 수면 루틴 재점검, 이 주 이상이면 클리닉 연락." });
      t.save();
    });
    singleAfter(b, 0, ex, (t) => {
      t.x("a0-open", "이 카드는 프로그램이 끝난 뒤에도 프로그램 목록에서 언제든 다시 열어 볼 수 있습니다. 파도가 왔을 때 열어 보세요.");
    });
    reopen(b, 0, { single: true });
  },

  week8_summary(b) {
    b.screen(0, (t) => {
      t.intro();
      t.readAll();
      t.next("'홈으로' 버튼을 누르면 정규 과정이 끝납니다. 앱의 모든 내용과 기록은 그대로 남아 있으니 언제든 다시 열어 보세요.");
    });
  },
};
