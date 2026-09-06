# 이명 관리 프로그램 (이명 CBT 8주 웹앱)

이명 인지행동치료 8주 프로그램의 환자용 웹앱입니다. 서버 없이 정적 파일만으로 동작하며 GitHub Pages에서 바로 구동됩니다.
모든 기록(일기, 워크시트, 설문, 소리 치료 사용 시간)은 환자 기기의 브라우저(localStorage)에만 저장되고, 설정 화면에서 JSON 파일로 내보내거나 가져올 수 있습니다.

## 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 앱 골격 (상단/하단 내비게이션) |
| `style.css` | 디자인 (크림색 바탕, 세리프 제목, 테라코타 포인트) |
| `app.js` | 라우팅, 저장소, 모듈 뷰어, 워크시트, THI 설문, 일기, 사운드, 기록, 설정 |
| `data/program.js` | 8주 원고 전체 (자동 생성 — 직접 수정하지 마세요) |
| `data/sounds.js` | **소리 치료 유튜브 영상 ID 목록 — 여기에 ID를 채워 넣으세요** |
| `tools/build_content.py` | `../pwa/content/*.json` 원고를 `data/program.js`로 묶는 스크립트 |

## 유튜브 소리 연결하기

`data/sounds.js`를 열어 각 항목의 `youtubeId`에 영상 ID를 넣습니다.
주소가 `https://www.youtube.com/watch?v=AbCdEfGhIjK` 라면 ID는 `AbCdEfGhIjK` 입니다.
ID가 비어 있는 항목은 화면에 "준비 중"으로 표시됩니다. 영상은 **미등록(unlisted)** 으로 올려도 재생됩니다 (비공개는 안 됨).

## 원고 수정하기

원고는 상위 폴더 `pwa/content/`의 JSON이 원본입니다. 수정 후 아래를 실행하면 `data/program.js`가 갱신됩니다.

```bash
python3 tools/build_content.py
```

## 로컬에서 열어보기

```bash
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080
```

## 배포

GitHub 저장소의 Settings → Pages → Branch `main` / root 로 설정하면 `https://<계정>.github.io/<저장소>/` 에서 열립니다.
