// 소리 치료 재생 목록.
// src 가 있으면 앱 안의 오디오 파일(audio/)을 끊김 없이 반복 재생합니다.
// youtubeId 는 유튜브 영상 ID 입니다 (https://www.youtube.com/watch?v=AbCdEfGhIjK 라면 "AbCdEfGhIjK").
// hidden: true 인 묶음·항목은 화면에 보이지 않습니다. 다시 쓰려면 hidden 을 지우세요.
window.SOUNDS = {
  note: "볼륨은 이명보다 약간 작거나, 작은 소리 크기로 맞춰 주세요. 이명이 살짝 들릴 정도가 적당하며, 너무 크게 들으면 오히려 청각 피로를 유발할 수 있습니다.",
  groups: [
    {
      id: "therapy",
      hidden: true, // 2026-09-13 사용하지 않기로 함 (노치·CR·광대역)
      title: "이명 소리 치료",
      desc: "클리닉에서 안내받은 소리를 선택해 재생하세요. 재생·정지 시간은 자동으로 기록됩니다.",
      items: [
        { id: "notch",   title: "노치 사운드",  desc: "이명 주파수 대역을 걸러낸 소리입니다.", youtubeId: "" },
        { id: "cr",      title: "CR 톤",        desc: "이명 주파수 주변 4개 톤을 무작위 순서로 반복합니다. ※ CR(Coordinated Reset)은 아직 연구 중인 방법입니다.", youtubeId: "" },
        { id: "broadband", title: "광대역 소리", desc: "부드러운 배경 소리입니다.", youtubeId: "" },
      ],
    },
    {
      id: "nature",
      title: "자연음",
      desc: "편안함과 이완을 위한 소리입니다. 취침 전 낮은 볼륨으로 틀어 두어도 좋습니다. 소리를 누르면 화면이 검게 바뀌며, 두 번 두드리면 멈춥니다.",
      items: [
        { id: "rain",      title: "빗소리",    desc: "잔잔한 빗소리, 끊김 없이 반복", src: "audio/rain.m4a", youtubeId: "" },
        { id: "waves",     title: "파도소리",  desc: "밀려왔다 밀려가는 파도, 끊김 없이 반복", src: "audio/ocean.m4a", youtubeId: "" },
        { id: "fire",      title: "장작불",    desc: "타닥거리는 장작불 소리, 끊김 없이 반복", src: "audio/fireplace.m4a", youtubeId: "" },
        { id: "stream",    title: "계곡물",    desc: "", youtubeId: "", hidden: true },
        { id: "waterfall", title: "폭포소리",  desc: "", youtubeId: "", hidden: true },
        { id: "wind",      title: "바람소리",  desc: "", youtubeId: "", hidden: true },
        { id: "crickets",  title: "밤 풀벌레", desc: "", youtubeId: "", hidden: true },
      ],
    },
  ],
};
