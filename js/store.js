/* store.js - 数据层：localStorage 兜底 + Supabase 云同步
 * 接口：
 *   Store.init()
 *   Store.list({from,to}) -> Promise<events[]>
 *   Store.create(ev) -> Promise<ev>
 *   Store.update(id, patch)
 *   Store.remove(id)
 *   Store.onChange(cb)
 *   Store.export() / Store.import(json)
 *   Store.isCloud() / Store.user()
 */
window.Store = (function () {
  const LS_KEY = "talkcal.events.v1";
  let events = [];
  let sb = null;
  let userInfo = null;
  const listeners = [];

  function loadLocal() {
    try { events = JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { events = []; }
  }
  function saveLocal() {
    localStorage.setItem(LS_KEY, JSON.stringify(events));
  }
  function emit() { listeners.forEach((cb) => cb(events)); }

  async function init() {
    loadLocal();
    const url = localStorage.getItem("talkcal.sb.url");
    const key = localStorage.getItem("talkcal.sb.key");
    if (url && key) {
      try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        sb = createClient(url, key);
        const { data } = await sb.auth.getSession();
        userInfo = data?.session?.user || null;
        // 拉取云端
        const { data: cloud } = await sb.from("events").select("*").order("start_at");
        if (cloud && cloud.length) {
          // 合并：云端为准
          events = cloud;
          saveLocal();
        }
        // 订阅 realtime
        sb.channel("events-changes")
          .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => reload())
          .subscribe();
      } catch (e) {
        console.warn("[talkcal] Supabase 接入失败，走本地模式：", e.message);
        sb = null;
      }
    }
    emit();
  }

  async function reload() {
    if (!sb) return;
    const { data } = await sb.from("events").select("*").order("start_at");
    if (data) { events = data; saveLocal(); emit(); }
  }

  function list({ from, to } = {}) {
    return events.filter((e) => {
      if (e.status === "cancelled") return false;
      if (from && e.end_at < from) return false;
      if (to && e.start_at > to) return false;
      return true;
    });
  }

  async function create(ev) {
    const now = new Date().toISOString();
    const row = {
      id: ev.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
      title: ev.title,
      start_at: ev.start_at,
      end_at: ev.end_at,
      priority: ev.priority || "med",
      category: ev.category || "life",
      note: ev.note || "",
      status: "scheduled",
      user_id: userInfo?.id || null,
      created_at: now, updated_at: now,
    };
    events.push(row);
    saveLocal(); emit();
    if (sb) {
      try { await sb.from("events").upsert(row); } catch (e) { console.warn(e); }
    }
    return row;
  }

  async function update(id, patch) {
    const row = events.find((e) => e.id === id);
    if (!row) return;
    Object.assign(row, patch, { updated_at: new Date().toISOString() });
    saveLocal(); emit();
    if (sb) {
      try { await sb.from("events").update(patch).eq("id", id); } catch (e) { console.warn(e); }
    }
  }

  async function remove(id) {
    // 软删除：标 cancelled，这样未来推送不会触发
    await update(id, { status: "cancelled" });
  }

  function onChange(cb) { listeners.push(cb); }

  function exportJSON() {
    return JSON.stringify({ version: 1, exported_at: new Date().toISOString(), events }, null, 2);
  }
  function importJSON(text) {
    const obj = JSON.parse(text);
    if (Array.isArray(obj.events)) { events = obj.events; saveLocal(); emit(); }
  }

  function isCloud() { return !!sb; }
  function currentUser() { return userInfo; }
  function sbClient() { return sb; }

  return { init, list, create, update, remove, onChange, export: exportJSON, import: importJSON, isCloud, currentUser, sbClient, reload };
})();
