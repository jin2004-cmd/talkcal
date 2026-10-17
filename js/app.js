/* app.js - 启动入口 + Tab 路由 + 设置 [V2 动效接入] */
(function () {
  function $(id) { return document.getElementById(id); }

  // ---- 皮肤系统 [V2-02] ----
  function applySkin(skin) {
    document.documentElement.dataset.skin = skin || "light";
    localStorage.setItem("talkcal.skin", skin || "light");
  }
  function initSkin() {
    const saved = localStorage.getItem("talkcal.skin") || "light";
    $("setSkin").value = saved;
    applySkin(saved);
    $("setSkin").onchange = () => {
      applySkin($("setSkin").value);
      Anim.buzz(8);
    };
  }

  // ---- Tab 切换 ----
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((t) => {
    Anim.press(t);
    t.onclick = () => switchView(t.dataset.view);
  });
  function switchView(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    $("view-" + name).classList.add("active");
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.view === name));
    document.body.dataset.currentView = name;
    if (name === "upcoming") renderUpcoming();
    if (name === "profile") renderProfile();
  }

  // ---- 概览 [V2-20] stagger + [V2.3-02] 分"即将到来"+"已完成历史" ----
  function renderUpcoming() {
    const list = $("upcomingList");
    const empty = $("upcomingEmpty");
    const doneList = $("doneList");
    const doneEmpty = $("doneEmpty");
    list.innerHTML = "";
    doneList.innerHTML = "";

    const from = new Date(); from.setHours(0,0,0,0);
    const to = new Date(from); to.setDate(to.getDate() + 7);
    const all = Store.list({});

    // 即将到来：scheduled 状态，未来 7 天
    const evs = all
      .filter((e) => e.status !== "done" && !e.id.startsWith("__"))
      .filter((e) => e.start_at >= from.toISOString() && e.start_at < to.toISOString())
      .sort((a, b) => {
        // 先按优先级（high=0, med=1, low=2），再按时间
        const pw = { high: 0, med: 1, low: 2 };
        const pa = pw[a.priority] ?? 1, pb = pw[b.priority] ?? 1;
        if (pa !== pb) return pa - pb;
        return a.start_at.localeCompare(b.start_at);
      });

    empty.style.display = evs.length ? "none" : "block";
    evs.forEach((ev, i) => {
      const li = document.createElement("li");
      li.className = "p-" + ev.priority;
      li.innerHTML = `<div>
        <div class="title"></div>
        <div class="when"></div>
      </div>
      <div class="actions">
        <button data-act="done" title="完成">✓</button>
        <button data-act="del" title="删除">✕</button>
      </div>`;
      li.querySelector(".title").textContent = ev.title;
      li.querySelector(".when").textContent =
        `${ev.start_at.replace("T"," ").slice(5,16)} · ${Priority.label(ev.priority)}`;
      li.querySelector('[data-act="del"]').onclick = async () => {
        await Store.remove(ev.id);
        Anim.destroy(li);
        Anim.buzz(20);
        if (window.Toast) {
          Toast.show({
            text: `已取消「${ev.title}」`,
            undo: async () => { await Store.update(ev.id, { status: "scheduled" }); }
          });
        }
      };
      li.querySelector('[data-act="done"]').onclick = async () => {
        await Store.update(ev.id, { status: "done" });
        if (window.Confetti) Confetti.burst();
        Anim.destroy(li);
        renderUpcoming();
      };
      list.appendChild(li);
      Anim.fadeIn(li, { delay: i * 40 });
    });

    // 已完成历史：倒序，像日记
    const dones = all
      .filter((e) => e.status === "done" && !e.id.startsWith("__"))
      .sort((a, b) => (b.done_at || b.updated_at || b.start_at).localeCompare(a.done_at || a.updated_at || a.start_at))
      .slice(0, 30);
    doneEmpty.style.display = dones.length ? "none" : "block";
    dones.forEach((ev, i) => {
      const li = document.createElement("li");
      li.className = "done-item";
      li.innerHTML = `<div>
        <div class="title"></div>
        <div class="when"></div>
      </div>`;
      li.querySelector(".title").textContent = ev.title;
      li.querySelector(".when").textContent =
        `${ev.start_at.replace("T"," ").slice(0,10)} 完成 · ${Priority.label(ev.priority)}`;
      doneList.appendChild(li);
      Anim.fadeIn(li, { delay: i * 30 });
    });
  }

  // ---- 个人中心 [V2-06] 数字滚动 ----
  function renderProfile() {
    const all = JSON.parse(localStorage.getItem("talkcal.events.v1") || "[]");
    Anim.rollNumber($("statTotal"), all.length);
    Anim.rollNumber($("statDone"), all.filter((e) => e.status === "done").length);
    const days = new Set(all.map((e) => e.start_at.slice(0,10)));
    Anim.rollNumber($("statStreak"), days.size);
    const u = Store.currentUser();
    $("profileEmail").textContent = u?.email || (Store.isCloud() ? "已连接" : "未登录（本地模式）");
    $("profileDevices").textContent = Store.isCloud() ? "已上云" : "本地设备";
  }

  // ---- 设置 ----
  function loadSettings() {
    $("setLlmBase").value = localStorage.getItem("talkcal.llm.base") || "https://api.deepseek.com/v1";
    $("setLlmKey").value = localStorage.getItem("talkcal.llm.key") || "";
    $("setLlmModel").value = localStorage.getItem("talkcal.llm.model") || "deepseek-chat";
    $("setSbUrl").value = localStorage.getItem("talkcal.sb.url") || "";
    $("setSbKey").value = localStorage.getItem("talkcal.sb.key") || "";
    $("setLeadMin").value = localStorage.getItem("talkcal.lead") || "10";
    $("setEvalThreshold").value = localStorage.getItem("talkcal.eval.threshold") || "7";
    // [V2.3-03] 机器人名字 + 头像
    $("setBotName").value = localStorage.getItem("talkcal.bot.name") || "小谈";
    renderAvatarPicker();
  }

  // [V2.3-03] 渲染头像选择器
  function renderAvatarPicker() {
    const box = $("botAvatarPicker");
    box.innerHTML = "";
    const cur = Bots.currentId();
    Bots.list().forEach((b) => {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = "avatar-opt" + (b.id === cur ? " selected" : "");
      opt.innerHTML = Bots.svg(b.id);
      opt.title = b.name;
      opt.onclick = () => {
        localStorage.setItem("talkcal.bot.avatar", b.id);
        Bots.apply();
        renderAvatarPicker();
      };
      box.appendChild(opt);
    });
  }

  function saveSettings() {
    localStorage.setItem("talkcal.llm.base", $("setLlmBase").value.trim());
    localStorage.setItem("talkcal.llm.key", $("setLlmKey").value.trim());
    localStorage.setItem("talkcal.llm.model", $("setLlmModel").value.trim() || "deepseek-chat");
    localStorage.setItem("talkcal.sb.url", $("setSbUrl").value.trim());
    localStorage.setItem("talkcal.sb.key", $("setSbKey").value.trim());
    localStorage.setItem("talkcal.lead", $("setLeadMin").value);
    localStorage.setItem("talkcal.eval.threshold", $("setEvalThreshold").value);
    // [V2.3-03] 机器人名字
    const nm = $("setBotName").value.trim() || "小谈";
    localStorage.setItem("talkcal.bot.name", nm);
    Bots.apply();
    window.LLM.configure({
      base: $("setLlmBase").value.trim(),
      key: $("setLlmKey").value.trim(),
      model: $("setLlmModel").value.trim() || "deepseek-chat",
    });
    const s = $("settingsSaved");
    s.hidden = false; setTimeout(() => s.hidden = true, 1500);
  }

  // ---- 导出/导入 ----
  $("exportBtn").onclick = () => {
    const blob = new Blob([Store.export()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `talkcal-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };
  $("importBtn").onclick = () => $("importFile").click();
  $("importFile").onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then((t) => { Store.import(t); alert("导入完成"); });
  };
  // [V2.1-03] .ics 导出
  $("exportIcsBtn").onclick = () => Ics.download();
  Anim.press($("exportIcsBtn"));

  $("saveSettingsBtn").onclick = saveSettings;
  Anim.press($("saveSettingsBtn"));
  Anim.press($("exportBtn"));
  Anim.press($("importBtn"));

  // ---- 启动 ----
  window.addEventListener("DOMContentLoaded", async () => {
    initSkin();
    loadSettings();
    window.LLM.configure({
      base: localStorage.getItem("talkcal.llm.base") || "https://api.deepseek.com/v1",
      key: localStorage.getItem("talkcal.llm.key") || "",
      model: localStorage.getItem("talkcal.llm.model") || "deepseek-chat",
    });
    await Store.init();
    await PushClient.init();
    CalendarView.init();
    Chat.init();
    switchView("calendar");
    registerSW();
    updateTodayRing();
    initSearch();
    initLongPressAdd();
    // [V2.5] 任何 Store 变化都刷新进度环
    Store.onChange(() => updateTodayRing());
  });

  // ---- [V2.5-01] 今日进度环 ----
  function updateTodayRing() {
    const all = Store.list({});
    const today = new Date().toISOString().slice(0,10);
    const todays = all.filter((e) => !e.id.startsWith("__") && e.start_at.slice(0,10) === today);
    const total = todays.length;
    const done = todays.filter((e) => e.status === "done").length;
    const ring = $("todayRing");
    const fg = $("ringFg");
    $("ringText").textContent = `${done}/${total}`;
    const C = 97.4; // 2*pi*15.5
    fg.style.strokeDashoffset = total ? String(C * (1 - done/total)) : C;
    ring.classList.toggle("all-done", total > 0 && done === total);
    // [V2.5-04] 全部完成撒花
    if (total > 0 && done === total && !localStorage.getItem("talkcal.celebrated." + today)) {
      localStorage.setItem("talkcal.celebrated." + today, "1");
      if (window.Confetti) { Confetti.burst(); setTimeout(() => Confetti.burst(), 300); }
      if (window.Toast) Toast.show({ text: "🎉 今日任务全部完成！" });
    }
  }

  // ---- [V2.5-02] 全局搜索 ----
  function initSearch() {
    const overlay = $("searchOverlay");
    const input = $("searchInput");
    const results = $("searchResults");
    $("searchBtn").onclick = () => { overlay.hidden = false; input.focus(); };
    $("searchClose").onclick = () => { overlay.hidden = true; input.value = ""; results.innerHTML = ""; };
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.click && ($("searchClose").click()); });
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      results.innerHTML = "";
      if (!q) return;
      const hits = Store.list({}).filter((e) => !e.id.startsWith("__") &&
        (e.title || "").toLowerCase().includes(q)
      ).slice(0, 20);
      if (!hits.length) { results.innerHTML = '<div class="empty-hint">没找到相关事项</div>'; return; }
      hits.forEach((ev) => {
        const d = document.createElement("div");
        d.className = "sr-item";
        d.innerHTML = `<div style="font-weight:600"></div><div style="font-size:12px;opacity:.7"></div>`;
        d.children[0].textContent = ev.title;
        d.children[1].textContent = `${ev.start_at.replace("T"," ").slice(0,16)} · ${ev.status === "done" ? "✅ 已完成" : "⏳ 待办"}`;
        d.onclick = () => {
          overlay.hidden = true;
          // 跳日历到该日期
          if (window.CalendarView && CalendarView.jumpTo) CalendarView.jumpTo(ev.start_at.slice(0,10));
        };
        results.appendChild(d);
      });
    });
  }

  // ---- [V2.5-03] 日历长按日期 → 快捷添加 ----
  function initLongPressAdd() {
    const grid = $("calendarGrid");
    let timer = null;
    grid.addEventListener("pointerdown", (e) => {
      const cell = e.target.closest(".day");
      if (!cell) return;
      const ymd = cell.dataset.date;
      if (!ymd) return;
      timer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(10);
        if (window.Chat) Chat.open();
        const inp = $("chatInput");
        const [y, m, d] = ymd.split("-");
        inp.placeholder = `${parseInt(m)}月${parseInt(d)}日 要做什么？`;
        inp.focus();
      }, 500);
    });
    ["pointerup","pointermove","pointercancel"].forEach((ev) =>
      grid.addEventListener(ev, () => { if (timer) { clearTimeout(timer); timer = null; } })
    );
  }

  // ---- [V2.4] Service Worker 自动更新提示 ----
  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      const promptUpdate = (sw) => {
        // 页面顶部弹一个可点击的更新条
        const bar = document.createElement("div");
        bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#0f172a;color:#fff;padding:10px 16px;font-size:14px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,.3);";
        bar.innerHTML = '<span>发现新版本 ✨</span><button style="background:#22c55e;color:#fff;border:0;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px;">立即刷新</button>';
        bar.querySelector("button").onclick = () => {
          sw.postMessage("SKIP_WAITING");
          bar.remove();
        };
        document.body.appendChild(bar);
      };

      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            promptUpdate(sw);
          }
        });
      });
    });

    // 新 SW 接管后自动刷新一次
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        location.reload();
      }
    });
  }
})();
