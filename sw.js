/* 오프라인용 서비스 워커 — 앱 껍데기만 캐시 (유튜브·폰트·의료진 페이지는 캐시하지 않음)
   버전 번호는 index.html의 ?v= 와 함께 올립니다. */
const VERSION = "11"; // index.html 의 ?v= 번호와 같게
const CACHE = "tinnitus-cbt-" + VERSION;
const V = "?v=" + VERSION;
const SHELL = ["./", "index.html", "style.css" + V, "app.js" + V, "illustrations.js" + V, "transfer.js" + V,
  "data/program.js" + V, "data/sounds.js?v=1", "vendor/qrcode.min.js", "icon.svg", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // 외부(유튜브, 폰트)는 건드리지 않음
  if (/clinic\.|jsQR/.test(url.pathname)) return; // 의료진 페이지는 환자 폰에 캐시하지 않음
  e.respondWith(fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
    .catch(() => caches.match(e.request).then((r) => r || (e.request.mode === "navigate" ? caches.match("index.html") : undefined))));
});
