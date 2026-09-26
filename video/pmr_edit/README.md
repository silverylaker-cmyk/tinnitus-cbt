# 복지부(마음허그) 근육이완 영상 편집

원본: Google Drive `CBT/나레이션영상/Screen_Recording_20260926_134739_YouTube.mp4` (11:51, 1078×608)
결과: 1920×1080 30fps, `video/out/` (gitignore) — 저장소에는 올리지 않습니다.

## 하는 일
- 앞 1.5초(유튜브 재생 버튼이 찍힌 부분) 삭제
- 코끼리 대사 삭제 (0.5초 크로스페이드로 이음)
  - A: "풀밭에 누워…", "아기 코끼리가 주위를 살피지 않고…", "아기 코끼리가 다른 쪽으로 갑니다."
  - B: A + "달아날 시간이 없어서…", "다시 아기 코끼리가 오고 있습니다."
- 오른쪽 위 안내 카드 (앱 5주차 타이머와 같은 색): 부위 n/10, 회차 1/2, 긴장·이완 초 카운트다운, 진행 막대
- 안전 문구: 시작(70~80% 힘, 다친 부위 건너뛰기), 목(부드럽게), 입꼬리(이는 악물지 않기), 끝(이명이 들려도 그대로)

## 다시 만들기
```bash
pip install imageio-ffmpeg faster-whisper   # ffmpeg 바이너리, 받아쓰기
# 글꼴: Pretendard-Bold/SemiBold.otf 를 fonts/ 에 (cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/)
python3 build.py A --render    # 또는 B
```
구간 시각(긴장/이완 시작·끝, 자를 곳)은 `transcript.txt`(Whisper small, 원본 기준 초)를 보고 `build.py` 에 적었습니다.
