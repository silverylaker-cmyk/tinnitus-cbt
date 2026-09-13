// 화면 문장 → 읽기용(TTS) 문장. 화면 글자는 그대로 두고, 읽는 문장만 바꾼다.
// 숫자는 한글로, '~'는 '에서', 줄표·가운뎃점은 쉼표, 괄호는 쉼표로 풀어 쓴다.
// (드라마 제작 인계 문서의 실측 규칙: 숫자는 한글로, 말줄임표·줄표 제거, 한 줄 = 한 문장)

const SINO = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
const NATIVE = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉"];
const NATIVE_TENS = ["", "열", "스물", "서른", "마흔", "쉰", "예순", "일흔", "여든", "아흔"];

export function sino(n) {
  n = Number(n);
  if (n === 0) return "영";
  if (n >= 1000) return String(n);
  let out = "";
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
  if (h) out += (h === 1 ? "" : SINO[h]) + "백";
  if (t) out += (t === 1 ? "" : SINO[t]) + "십";
  if (o) out += SINO[o];
  return out;
}
export function native(n) {
  n = Number(n);
  if (n === 0) return "영";
  if (n >= 100) return sino(n);
  const t = Math.floor(n / 10), o = n % 10;
  // 스물+단위 → '스무' (스무 분), 하나/둘/셋/넷은 단위 앞에서 한/두/세/네
  if (t === 2 && o === 0) return "스무";
  return NATIVE_TENS[t] + NATIVE[o];
}
// 받침 유무 → 은/는
const hasBatchim = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
export const eunNeun = (w) => (hasBatchim(w) ? "은" : "는");
export const eulReul = (w) => (hasBatchim(w) ? "을" : "를");

// 단위별 읽기: 한자어 수(sino) / 고유어 수(native)
const SINO_UNITS = ["분", "초", "주차", "주", "점", "퍼센트", "회", "단계", "일", "월", "년", "번째", "층", "도"];
const NATIVE_UNITS = ["시간", "시", "번", "개", "가지", "부위", "명", "달", "살", "마디", "군데", "잔"];
const UNIT_RE = "(시간|시|주차|주|분|초|점|퍼센트|회|단계|번째|번|개|가지|부위|명|달|살|마디|군데|잔|일|월|년|층|도)";

function num(n, unit) {
  if (!unit) return sino(n);
  if (NATIVE_UNITS.includes(unit)) return native(n) + " " + unit;
  return sino(n) + " " + unit;
}

export function tts(text) {
  let s = String(text);
  // 약어·기호
  s = s.replace(/PMR/g, "피엠알").replace(/\bACT\b/g, "액트").replace(/\bTV\b/g, "티비").replace(/OO/g, "무엇무엇");
  s = s.replace(/'후—'/g, "'후우'").replace(/후—/g, "후우");
  s = s.replace(/%/g, "퍼센트");
  // 시각 23:10 → 오후 열한 시 십 분, 점수 6/10 → 십 점 만점에 육 점, 구분 기호 + / → 쉼표
  s = s.replace(/(\d{1,2}):(\d{2})/g, (_, h, mi) => { h = Number(h); mi = Number(mi); const ap = h >= 12 ? "오후 " : ""; const hh = h > 12 ? h - 12 : h === 0 ? 12 : h; return `${ap}${native(hh)} 시${mi ? " " + sino(mi) + " 분" : ""}`; });
  s = s.replace(/(\d+)\s*\/\s*10\b/g, (_, n) => `십 점 만점에 ${sino(n)} 점`);
  s = s.replace(/\s*\+\s*/g, ", 그리고 ");
  s = s.replace(/\s*\/\s*/g, ", ");
  s = s.replace(/(\d+)\s*→\s*(\d+)/g, "$1에서 $2");        // 7 → 3
  s = s.replace(/대신\s*→\s*/g, "대신, ");                   // "…" 대신 → A → B
  s = s.replace(/\s*→\s*/g, ", 그다음 ");
  s = s.replace(/\s*—\s*/g, ", ").replace(/\s*·\s*/g, ", ");
  s = s.replace(/\(선택\)/g, ", 선택 사항");
  s = s.replace(/\((.*?)\)/g, ", $1");                        // 괄호 → 쉼표
  s = s.replace(/([가-힣])\s*=\s*([가-힣'"“])/g, (_, a, b) => `${a}${eunNeun(a)} ${b}`); // '침대 = 뒤척이는 곳'
  s = s.replace(/([가-힣])-([가-힣])/g, "$1과 $2");             // 이명-배경, 호흡-단서어
  // 칸 번호 범위: 1~3번을 → 일 번에서 삼 번을 (순서 번호는 한자어)
  s = s.replace(/(\d+)~(\d+)번(으로|을|를|까지|에|과|의)/g, (_, a, b, p) => `${sino(a)} 번에서 ${sino(b)} 번${p}`);
  // 작은 범위는 자연스럽게: 1~2회 → 한두 번, 2~3회 → 두세 번, 2~3개 → 두세 개
  const SMALL = { "1~2": "한두", "2~3": "두세", "3~4": "서너" };
  s = s.replace(/(1~2|2~3|3~4)(회|번|개|가지|명|잔|군데)/g, (_, r, u) => `${SMALL[r]} ${u === "회" ? "번" : u}`).replace(/번로/g, "번으로");
  s = s.replace(/\s+,/g, ",").replace(/,\s*,/g, ",");
  s = s.replace(/예:\s*/g, "예를 들어, ");
  // 'N=' → 'N은/는'
  s = s.replace(/(\d+)\s*=\s*/g, (_, n) => { const w = sino(n); return w + eunNeun(w) + " "; });
  // 주차 범위: 1~2주차 → 일 주차와 이 주차
  s = s.replace(/(\d+)~(\d+)주차/g, (_, a, b) => `${sino(a)} 주차와 ${sino(b)} 주차`);
  // 범위: 5~7초, 10~15분, 0~10, 30초~1분, 2~3회
  s = s.replace(new RegExp(`(\\d+)\\s*${UNIT_RE}?\\s*~\\s*(\\d+)\\s*${UNIT_RE}?`, "g"), (_, a, ua, b, ub) => {
    const u1 = ua || ub, u2 = ub || ua;
    return `${num(a, u1)}에서 ${num(b, u2)}`;
  });
  // 순서 번호(칸 번호 등): 1번으로, 1~3번을 → 한자어
  s = s.replace(/(\d+)번(으로|을|를|까지|에|과|의)/g, (_, n, p) => `${sino(n)} 번${p}`);
  // 숫자 + 단위
  s = s.replace(new RegExp(`(\\d+)\\s*${UNIT_RE}`, "g"), (_, n, u) => num(n, u));
  // 남은 숫자는 한자어 수
  s = s.replace(/\d+/g, (n) => sino(n));
  // 문장 가운데 쌍점(숙제: 사고기록지) → 쉼표, 앞머리에 남은 쉼표 제거
  s = s.replace(/([가-힣'’”)])\s*:\s+(?=\S)/g, "$1, ");
  // 공백 정리
  s = s.replace(/\s{2,}/g, " ").replace(/\s+([.,?!])/g, "$1").replace(/^[,\s]+/, "").trim();
  return s;
}

// 아직 읽기 어려운 글자가 남았는지 (검사용)
export function ttsLeftovers(text) {
  const bad = text.match(/[0-9A-Za-z~→—·%+/=]|[가-힣]:\s*[가-힣]/g);
  return bad ? Array.from(new Set(bad)) : [];
}
