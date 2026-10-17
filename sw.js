// sw.js - Service Worker：缓存静态资源 + 接收 Web Push
// [V2.4] 加自动更新提示：监听 SKIP_WAITING 消息
// [V2.6] bump cache
const CACHE = "talkcal-v2.6.0";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/calendar.js",
  "./js/chat.js",
  "./js/eval.js",
  "./js/llm.js",
  "./js/priority.js",
  "./js/store.js",
  "./js/push.js",
  "./js/anim.js",
  "./js/confetti.js",
  "./js/toast.js",
  "./js/ics.js",
  "./js/bots.js",
  "./manifest.json",
  "./icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// [V2.4] 收到页面消息"SKIP_WAITING"时立即激活
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // 导航请求：网络优先，失败回退缓存
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return resp;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return resp;
    })).catch(() => caches.match("./index.html"))
  );
});

self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data?.json() || {}; } catch {}
  e.waitUntil(self.registration.showNotification(data.title || "TalkCal", {
    body: data.body || "你有一个日程提醒",
    icon: "./icon.svg",
    badge: "./icon.svg",
    data: data.data || {},
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((cs) => {
    for (const c of cs) { if (c.url.includes(self.location.origin)) return c.focus(); }
    return self.clients.openWindow("./");
  }));
});
