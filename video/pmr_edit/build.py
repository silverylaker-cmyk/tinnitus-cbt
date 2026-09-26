#!/usr/bin/env python3
"""복지부 근육이완 영상 편집: 코끼리 대사 삭제 + 앱 타이머와 같은 안내 카드(부위·반복·긴장/이완 카운트다운) + 안전 자막.
사용: python3 build.py A|B   (A = 요청한 3줄만 삭제, B = 코끼리 대사 전부 삭제)
"""
import math, subprocess, sys

VER = sys.argv[1] if len(sys.argv) > 1 else "A"
SRC, END = "src.mp4", 711.8
XF = 0.5  # 이음새 크로스페이드(초)
W, H = 1920, 1080

CUTS = {
    # (시작, 끝) 원본 초
    "A": [(0, 1.5), (125.6, 141.4), (163.4, 167.6)],
    "B": [(0, 1.5), (125.6, 149.3), (163.4, 167.6), (188.7, 194.9)],
}[VER]

keep, t = [], 0.0
for a, b in CUTS:
    if a > t: keep.append((t, a))
    t = b
keep.append((t, END))

def out_time(x):
    off = 0.0
    for i, (s, e) in enumerate(keep):
        if x < s: return off - (XF if i else 0)  # 잘린 구간 안 → 다음 구간 시작
        if x <= e: return off + (x - s)
        off += (e - s) - XF
    return off

PARTS = ["발·종아리", "배", "왼손·팔", "오른손·팔", "어깨·팔뚝", "고개 돌리기", "목 뒤", "오른쪽 입꼬리", "왼쪽 입꼬리", "이마"]
# (부위, 회차, 총회, 종류, 시작, 끝) — 원본 시간
PH = []
def two(p, t1, r1, t2, r2, end):
    PH.extend([(p, 1, 2, "tense", t1, r1), (p, 1, 2, "relax", r1, None), (p, 2, 2, "tense", t2, r2), (p, 2, 2, "relax", r2, end)])
def one(p, t1, r1, end):
    PH.extend([(p, 1, 1, "tense", t1, r1), (p, 1, 1, "relax", r1, end)])
two(0, 40.8, 60.6, 84.2, 98.2, 121.0)
two(1, 149.5, 168.0, 195.1, 206.3, 221.5)
two(2, 229.3, 247.4, 269.0, 282.9, 301.4)
two(3, 312.8, 329.1, 353.1, 367.7, 389.5)
two(4, 391.1, 412.4, 431.5, 453.3, 467.5)
PH.append((5, 1, 1, "move", 468.9, 496.0))
two(6, 520.6, 541.8, 559.4, 574.4, 587.5)
one(7, 598.5, 613.5, 625.7)
one(8, 632.6, 646.0, 660.5)
one(9, 667.4, 682.7, 695.5)
# 첫 회차 이완의 끝 = 다음 회차 긴장 전 안내가 시작되는 지점
PH = [list(p) for p in PH]
for i, p in enumerate(PH):
    if p[5] is None: p[5] = {60.6: 79.5, 168.0: 188.5, 247.4: 262.3, 329.1: 345.6, 412.4: 426.0, 541.8: 554.4}[p[4]]

NOTES = [  # (시작, 끝, 문구) 원본 시간
    (2.0, 33.5, "아프지 않을 만큼(70~80% 힘)만 조입니다\\N다친 부위는 건너뛰세요"),
    (497.0, 587.5, "목은 부드럽게 — 아프면 바로 멈춥니다"),
    (588.5, 660.5, "이는 악물지 않습니다"),
    (696.0, 711.8, "연습 중 이명이 들려도 그대로 두세요\\N매일 한 번, 잠들기 전에 해도 좋습니다"),
]

def ts(x):
    x = max(0, x); h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f"{h}:{m:02d}:{s:05.2f}"
def rr(w, h, r):  # 둥근 사각형 ASS 드로잉
    k = r * 0.45
    return (f"m {r} 0 l {w-r} 0 b {w-k} 0 {w} {k} {w} {r} l {w} {h-r} b {w} {h-k} {w-k} {h} {w-r} {h} "
            f"l {r} {h} b {k} {h} 0 {h-k} 0 {h-r} l 0 {r} b 0 {k} {k} 0 {r} 0")

TEAL = "&H00929C3E&"
ACC, SOFT, SURF, INK, INK3, LINE = "&H002F54C2&", "&H00D9E2F3&", "&H00F8FBFC&", "&H00131414&", "&H00565D5F&", "&H00CBD7DB&"
CX, CY, CW, CH = 1450, 34, 436, 192
ev = []
def add(a, b, text, layer=0, style="Card"):
    if b - a > 0.04: ev.append(f"Dialogue: {layer},{ts(a)},{ts(b)},{style},,0,0,0,,{text}")

def card(a, b, part, step, label, count, kind, dur_total=None, elapsed0=0.0):
    bg = SOFT if kind == "tense" else SURF
    add(a, b, f"{{\\an7\\pos({CX},{CY})\\p1\\bord1.5\\3c{LINE}\\1c{bg}\\shad0}}{rr(CW, CH, 22)}{{\\p0}}", 0)
    add(a, b, f"{{\\an7\\pos({CX+30},{CY+26})\\fs28\\1c{INK3}\\b0}}{step}", 1)
    add(a, b, f"{{\\an7\\pos({CX+30},{CY+78})\\fs50\\1c{INK}\\b1}}{part}", 1)
    if dur_total:  # 진행 막대: 회색 바탕 + 시간 따라 늘어나는 색 막대
        bx, by, bw = CX + 30, CY + CH - 36, CW - 60
        add(a, b, f"{{\\an7\\pos({bx},{by})\\p1\\bord0\\shad0\\1c{LINE}}}{rr(bw, 10, 5)}{{\\p0}}", 1)
        x0 = bx + bw * elapsed0 / dur_total
        add(a, b, f"{{\\an7\\pos({bx},{by})\\p1\\bord0\\shad0\\1c{ACC if kind=='tense' else TEAL}"
                  f"\\clip({bx},{by-2},{x0:.0f},{by+12})\\t(0,{int((b-a)*1000)},\\clip({bx},{by-2},{bx+bw},{by+12}))}}{rr(bw, 10, 5)}{{\\p0}}", 2)

LBL = {"tense": "긴장", "relax": "이완", "move": "천천히"}
prev_end = None
for idx, (p, rep, reps, kind, s, e) in enumerate(PH):
    a, b = out_time(s), out_time(e)
    step = f"{p+1} / {len(PARTS)}" + (f"  ·  {rep}/{reps}회" if reps > 1 else "")
    # 앞 단계와의 빈틈: 다음 부위 안내 카드(카운트 없음)
    if prev_end is not None and a - prev_end > 0.1:
        card(prev_end, a, PARTS[p], step, "", "", "gap")
        add(prev_end, a, f"{{\\an9\\pos({CX+CW-30},{CY+26})\\fs30\\1c{INK3}\\b1}}준비", 3)
    dur = b - a
    card(a, b, PARTS[p], step, LBL[kind], "", kind, dur_total=dur)
    col = ACC if kind == "tense" else TEAL
    n = math.ceil(dur - 1e-6)
    for k in range(n):  # 초마다 숫자 교체
        t0, t1 = a + k, min(b, a + k + 1)
        rem = n - k
        add(t0, t1, f"{{\\an9\\pos({CX+CW-30},{CY+14})\\fs30\\1c{col}\\b1}}{LBL[kind]} {{\\fs58}}{rem}", 3)
    prev_end = b

NW = 600
for s, e, txt in NOTES:
    a, b = out_time(s), out_time(e)
    lines = txt.count("\\N") + 1
    nh = 34 + 44 * lines
    under = any(PH[0][4] <= s <= PH[-1][5] for _ in [0])  # 운동 중이면 카드 아래, 아니면 맨 위
    nx, ny = CX + CW - NW, (CY + CH + 14) if under else CY
    add(a, b, f"{{\\an7\\pos({nx},{ny})\\p1\\bord1.5\\3c{LINE}\\1c{SURF}\\shad0}}{rr(NW, nh, 22)}{{\\p0}}", 4)
    add(a, b, f"{{\\an7\\pos({nx+30},{ny+20})\\fs32\\1c{INK}\\b1\\q2}}{txt}", 5)

ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Card,Pretendard,40,{INK},{INK},{LINE},&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: Note,Pretendard,34,{INK},{INK},&H10F8FBFC,&H00000000,1,0,0,0,100,100,0,0,3,16,0,9,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(ev) + "\n"
open(f"overlay_{VER}.ass", "w").write(ass)

# ---- ffmpeg 필터 그래프 ----
fc, n = [], len(keep)
for i, (s, e) in enumerate(keep):
    fc.append(f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS,fps=30,scale={W}:{H}:flags=lanczos,setsar=1,format=yuv420p[v{i}]")
    fc.append(f"[0:a]atrim={s}:{e},asetpts=PTS-STARTPTS,aresample=48000[a{i}]")
vprev, aprev, off = "v0", "a0", 0.0
for i in range(1, n):
    off += (keep[i-1][1] - keep[i-1][0]) - XF
    fc.append(f"[{vprev}][v{i}]xfade=transition=fade:duration={XF}:offset={off:.3f}[vx{i}]")
    fc.append(f"[{aprev}][a{i}]acrossfade=d={XF}[ax{i}]")
    vprev, aprev = f"vx{i}", f"ax{i}"
total = sum(e - s for s, e in keep) - XF * (n - 1)
fc.append(f"[{vprev}]fade=t=in:st=0:d=0.6,ass=overlay_{VER}.ass:fontsdir=fonts[vo]")
fc.append(f"[{aprev}]afade=t=in:st=0:d=0.4,afade=t=out:st={total-1.0:.2f}:d=1.0[ao]")
open(f"graph_{VER}.txt", "w").write(";\n".join(fc))
print(f"version {VER}: keep={keep} total={total:.1f}s events={len(ev)}")
if "--render" in sys.argv:
    extra = sys.argv[sys.argv.index("--render")+1:]
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-stats", "-y", "-i", SRC, *extra, "-filter_complex_script", f"graph_{VER}.txt",
           "-map", "[vo]", "-map", "[ao]", "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-c:a", "aac", "-b:a", "160k",
           "-movflags", "+faststart", f"근육이완_편집_{VER}.mp4"]
    subprocess.run(cmd, check=True)
