/* push.js - Web Push 订阅管理
 * 需要：1) Service Worker（sw.js）；2) 用户在设置里填 VAPID public key；
 *       3) Supabase Edge Function 到点发 push。
 */
window.PushClient = (function () {
  let reg = null;

  async function init() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    try {
      reg = await navigator.serviceWorker.register("sw.js");
      return true;
    } catch (e) {
      console.warn("[talkcal] SW 注册失败", e);
      return false;
    }
  }

  function vapidKey() { return localStorage.getItem("talkcal.vapid.public") || ""; }

  async function subscribe() {
    if (!reg) await init();
    const key = vapidKey();
    if (!key) throw new Error("未配置 VAPID public key（在设置中心填）");
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
    const sb = window.Store.sbClient();
    if (sb) {
      await sb.from("push_subscriptions").upsert({
        endpoint: sub.endpoint,
        keys: sub.toJSON().keys,
        user_id: (window.Store.currentUser() || {}).id || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
    }
    return sub;
  }

  function urlBase64ToUint8Array(b64) {
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const norm = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(norm);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }

  return { init, subscribe, vapidKey };
})();
