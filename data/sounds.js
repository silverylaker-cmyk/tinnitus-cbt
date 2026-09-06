// 소리 치료 재생 목록 — 유튜브에 올린 영상의 ID를 여기에 적습니다.
// 유튜브 주소가 https://www.youtube.com/watch?v=AbCdEfGhIjK 라면 youtubeId 는 "AbCdEfGhIjK" 입니다.
// youtubeId 가 비어 있으면 화면에 "준비 중"으로 표시됩니다.
window.SOUNDS = {
  note: "볼륨은 이명보다 약간 작거나 비슷한 수준으로 맞춰 주세요. 이명이 살짝 들릴 정도가 적당하며, 너무 크게 들으면 오히려 청각 피로를 유발할 수 있습니다.",
  groups: [
    {
      id: "therapy",
      title: "이명 사운드 요법",
      desc: "클리닉에서 안내받은 소리를 선택해 재생하세요. 재생·정지 시간은 자동으로 기록됩니다.",
      items: [
        { id: "notch",   title: "노치 사운드",  desc: "이명 주파수 대역을 걸러낸 소리입니다.", youtubeId: "" },
        { id: "cr",      title: "CR 톤",        desc: "이명 주파수 주변 4개 톤을 무작위 순서로 반복합니다. ※ CR(Coordinated Reset)은 연구 중인 요법(investigational)입니다.", youtubeId: "" },
        { id: "broadband", title: "광대역 소리", desc: "부드러운 배경 소리입니다.", youtubeId: "" },
      ],
    },
    {
      id: "nature",
      title: "자연음",
      desc: "편안함과 이완을 위한 소리입니다. 취침 전 낮은 볼륨으로 틀어 두어도 좋습니다.",
      items: [
        { id: "rain",      title: "빗소리",    desc: "", youtubeId: "" },
        { id: "waves",     title: "파도소리",  desc: "", youtubeId: "" },
        { id: "stream",    title: "계곡물",    desc: "", youtubeId: "" },
        { id: "waterfall", title: "폭포소리",  desc: "", youtubeId: "" },
        { id: "fire",      title: "장작불",    desc: "", youtubeId: "" },
        { id: "wind",      title: "바람소리",  desc: "", youtubeId: "" },
        { id: "crickets",  title: "밤 풀벌레", desc: "", youtubeId: "" },
      ],
    },
  ],
};
