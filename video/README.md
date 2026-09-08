# 나레이션 영상 (Remotion)

웹앱 화면(`../style.css`, `../data/program.json`)을 그대로 9:16(1080×1920, 30fps) 폰 화면으로 재현하고,
문장 강조 · 자동 스크롤 · 손가락 포인터 · 타이핑 시연 · 큰 자막을 얹어 모듈별 안내 영상을 만듭니다.

## 준비

```bash
cd video
npm install
python3 ../tools/build_content.py     # content/*.json → data/program.json (내용 고쳤을 때)
npm run prep                          # 1) style.css → src/app.css  2) 대본 초안 scripts/*.json  3) 합성 목록
```

## 나레이션 오디오 (문장 1개 = 파일 1개)

```bash
# Gemini TTS (Google AI Studio 키). 채팅에 붙이지 말고 video/.env 에 넣습니다 (gitignored)
echo 'GEMINI_API_KEY=여기에_키' > .env
node tools/tts.mjs week1_psychoeducation        # 특정 모듈만
node tools/tts.mjs                              # 전체 35모듈
node tools/tts.mjs --engine=say                 # 키 없이 macOS 음성(Yuna)으로 임시 제작

# 선택: 목소리(Kore 기본), 모델, 말투 지시
GEMINI_TTS_VOICE=Aoede GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts node tools/tts.mjs week1_summary
```

- 결과: `public/audio/generated/<모듈>/<큐id>.wav` + `manifest.json`(길이). 이미 있는 파일은 건너뜁니다(`--force` 로 재생성).
- **내 목소리로 바꾸기**: `public/audio/voice/<모듈>/<큐id>.wav|mp3|m4a` 에 녹음 파일을 넣고 `node tools/tts.mjs <모듈>` 을 다시 실행하면 그 문장만 육성으로 교체됩니다. 큐 id 와 문장은 `scripts/<모듈>.json` 에 있습니다.
- 오디오를 새로 만든 뒤에는 `npm run index` (또는 `npm run prep`) 로 합성 목록을 갱신합니다.

## 대본 고치기

`scripts/<모듈>.json` 의 `say`(읽는 문장) · `highlight`(강조할 화면 문장 번호) · `point`(가리킬 요소 선택자) · `tap` · `type`(입력칸 타이핑) 을 고칩니다.
임상 문장은 여기서 고치지 말고 `../content/*.json` 에서 고친 뒤 `node tools/make_scripts.mjs --force --only=<모듈>` 로 다시 뽑습니다.

## 미리보기 · 렌더

```bash
npm run studio                                   # 브라우저에서 프레임 단위로 확인
npx remotion render week1-psychoeducation out/week1_psychoeducation.mp4   # 합성 id 는 모듈 id 의 _ 를 - 로
```
