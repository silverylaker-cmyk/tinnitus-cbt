#!/usr/bin/env python3
"""pwa/content/*.json + 모듈 목록 → data/program.js (window.PROGRAM) 로 묶는다.

원고를 고치려면 ../pwa/content/ 의 JSON을 수정한 뒤 이 스크립트를 다시 실행하세요.
    python3 tools/build_content.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "content"
OUT = ROOT / "data" / "program.js"

# (week, kind, title, content file)  — backend/scripts/seed_program.py 의 순서 그대로
MODULES = [
    (1, "learn",     "이명 이해하기 — 악순환과 안심 정보", "week1/psychoeducation.json"),
    (1, "write",     "나의 악순환 그리기",        "week1/worksheet.json"),
    (1, "homework",  "이번 주 숙제: 일기 시작하기",          "week1/homework.json"),
    (1, "summary",   "1주차 정리",                        "week1/summary.json"),
    (2, "learn",     "생각이 이명 경험을 바꿉니다",          "week2/psychoeducation.json"),
    (2, "write",     "사고기록지 연습",                    "week2/worksheet.json"),
    (2, "homework",  "이번 주 숙제: 사고기록지",             "week2/homework.json"),
    (2, "summary",   "2주차 정리",                        "week2/summary.json"),
    (3, "learn",     "주의는 유한한 자원입니다",             "week3/psychoeducation.json"),
    (3, "learn",     "마음챙김 호흡 훈련",                  "week3/training.json"),
    (3, "homework",  "이번 주 숙제: 매일 마음챙김",          "week3/homework.json"),
    (3, "summary",   "3주차 정리",                        "week3/summary.json"),
    (4, "learn",     "안전행동 — 보호가 덫이 될 때",         "week4/safety.json"),
    (4, "learn",     "믿음은 검증할 수 있습니다 — 행동실험",  "week4/psychoeducation.json"),
    (4, "write",     "나의 행동실험 계획",                  "week4/worksheet.json"),
    (4, "homework",  "이번 주 숙제: 행동실험",               "week4/homework.json"),
    (4, "summary",   "4주차 정리",                        "week4/summary.json"),
    (5, "learn",     "스트레스와 이명 — 이완의 원리",        "week5/psychoeducation.json"),
    (5, "learn",     "점진적 근육이완(PMR) 훈련",            "week5/training.json"),
    (5, "homework",  "이번 주 숙제: 매일 근육이완 반복",      "week5/homework.json"),
    (5, "summary",   "5주차 정리",                        "week5/summary.json"),
    (6, "learn",     "이완을 실전으로 — 응용이완법",         "week6/psychoeducation.json"),
    (6, "write",     "나의 축약 이완 설계",                 "week6/worksheet.json"),
    (6, "homework",  "이번 주 숙제: 축약 이완 실전",         "week6/homework.json"),
    (6, "summary",   "6주차 정리",                        "week6/summary.json"),
    (7, "learn",     "밤과 이명 — 수면 전략",               "week7/psychoeducation.json"),
    (7, "write",     "나의 취침 루틴 설계",                 "week7/worksheet.json"),
    (7, "homework",  "이번 주 숙제: 수면일기",               "week7/homework.json"),
    (7, "summary",   "7주차 정리",                        "week7/summary.json"),
    (8, "learn",     "이명과 함께 살아가기 — 수용전념(ACT)",  "week8/act.json"),
    (8, "learn",     "8주의 도구상자 — 총정리",             "week8/psychoeducation.json"),
    (8, "write",     "나의 위기 대응 카드",                 "week8/worksheet.json"),
    (8, "summary",   "8주를 마치며 — 이후 계획",            "week8/summary.json"),
]

WEEK_TITLES = {
    1: "이명 이해하기", 2: "생각 다루기", 3: "주의 옮기기", 4: "행동으로 확인하기",
    5: "몸을 이완하기", 6: "이완을 실전으로", 7: "밤과 잠", 8: "이명과 함께 살아가기",
}
WEEK_SUBTITLES = {
    1: "악순환 고리와 안심 정보", 2: "자동사고와 사고기록지", 3: "주의 훈련과 마음챙김 호흡",
    4: "안전행동과 행동실험", 5: "점진적 근육이완", 6: "응용이완법과 단서어",
    7: "수면 위생과 야간 전략", 8: "수용전념, 도구상자, 위기 대응 카드",
}

modules = []
for i, (week, kind, title, ref) in enumerate(MODULES, start=1):
    data = json.loads((SRC / ref).read_text(encoding="utf-8"))
    mid = ref.replace("/", "_").replace(".json", "")
    modules.append({"id": mid, "week": week, "kind": kind, "title": title,
                    "order": i, "screens": data["screens"]})

thi = json.loads((SRC / "questionnaires" / "thi.json").read_text(encoding="utf-8"))

program = {
    "name": "이명 CBT 8주 프로그램",
    "totalWeeks": 8,
    "weeks": [{"week": w, "title": WEEK_TITLES[w], "subtitle": WEEK_SUBTITLES[w]} for w in range(1, 9)],
    "modules": modules,
    "questionnaires": {"THI": thi},
}
OUT.write_text("// 자동 생성 파일 — tools/build_content.py 로 다시 만듭니다. 직접 수정하지 마세요.\n"
               "window.PROGRAM = " + json.dumps(program, ensure_ascii=False, indent=1) + ";\n",
               encoding="utf-8")
(ROOT / "data" / "program.json").write_text(json.dumps(program, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")  # 영상(리모션) 프로젝트용
print(f"wrote {OUT} ({OUT.stat().st_size:,} bytes, {len(modules)} modules)")
