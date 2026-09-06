# 이명 관리 프로그램 (이명 CBT 8주 웹앱)

이명 인지행동치료 8주 프로그램의 환자용 웹앱과 의료진용 태블릿 페이지입니다. 서버 없이 정적 파일만으로 동작하며 GitHub Pages에서 바로 구동됩니다.

- 환자용: `https://<계정>.github.io/<저장소>/` — 학습(나레이션), 워크시트, 일기, THI 설문, 소리 치료(유튜브), 기록, QR 전달
- 의료진용: `https://<계정>.github.io/<저장소>/clinic.html` — 태블릿 카메라로 환자 QR을 읽어 기록 저장·열람·백업 (환자 앱에는 링크가 없으니 태블릿에 즐겨찾기)

모든 기록은 각 기기의 브라우저(localStorage)에만 저장됩니다. 환자는 진료 때 QR로 전달하거나 설정에서 JSON으로 내보낼 수 있고, 태블릿은 백업 화면에서 전체 백업 파일을 내려받습니다.

## 구성

| 파일 | 역할 |
|---|---|
| `index.html`, `app.js`, `style.css` | 환자용 앱 (라우팅, 저장소, 모듈 뷰어, 워크시트, 설문, 일기, 소리, 기록, QR 전달, 설정) |
| `illustrations.js` | 주차별 라인아트, 악순환 고리 애니메이션, 호흡 가이드, 근육이완 안내 타이머 |
| `transfer.js` | 기록 압축 → QR 조각 → 재조립 (환자 앱과 태블릿 페이지 공용) |
| `clinic.html`, `clinic.js` | 의료진용 태블릿 페이지 (QR 수신, 환자 목록·상세, 주간 이행도, 진료 메모, 백업) |
| `sw.js` | 오프라인용 서비스 워커 (환자 앱 껍데기만 캐시) |
| `content/` | 8주 원고 JSON (원본 — 여기를 수정) |
| `data/program.js` | 원고 번들 (자동 생성 — 직접 수정하지 마세요) |
| `data/sounds.js` | **소리 치료 유튜브 영상 ID 목록 — 여기에 ID를 채워 넣으세요** |
| `vendor/` | qrcode-generator, jsQR |
| `tools/build_content.py` | `content/` → `data/program.js` 번들 스크립트 |
| `docs/review-log.md` | 5회 검토-수정 기록 |

## 유튜브 소리 연결하기

`data/sounds.js`의 각 항목 `youtubeId`에 영상 ID를 넣습니다. 주소가 `https://www.youtube.com/watch?v=AbCdEfGhIjK` 라면 ID는 `AbCdEfGhIjK` 입니다.
ID가 하나도 없으면 소리 화면에 "준비 중"만 표시됩니다. 영상은 **미등록(unlisted)** 으로 올리면 재생됩니다 (비공개는 안 됨). 공개 저장소이므로 ID는 누구나 볼 수 있습니다.

## 원고 수정하기

`content/weekN/*.json`을 수정한 뒤:

```bash
python3 tools/build_content.py
```

## 버전 올리기 (캐시)

파일을 수정해 배포할 때는 `index.html`·`clinic.html`의 `?v=` 번호와 `sw.js`의 `VERSION`을 함께 올려야 환자 폰에 새 버전이 내려갑니다.

## 로컬에서 열어보기

```bash
python3 -m http.server 8080   # http://localhost:8080  (카메라는 localhost 또는 HTTPS에서만 동작)
```

## 배포

GitHub 저장소의 Settings → Pages → Branch `main` / root.
