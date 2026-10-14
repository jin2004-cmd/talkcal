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

  // ---- 概览 [V2-20] stagger ----
  function renderUpcoming() {
    const list = $("upcomingList");
    const empty = $("upcomingEmpty");
    list.innerHTML = "";
    const from = new Date(); from.setHours(0,0,0,0);
    const to = new Date(from); to.setDate(to.getDate() + 7);
    const evs = Store.list({ from: from.toISOString(), to: to.toISOString() })
      .sort((a,b) => a.start_at.localeCompare(b.start_at));
    empty.style.display = evs.length ? "none" : "block";
    evs.forEach((ev, i) => {
      const li = document.createElement("li");
      li.className = "p-" + ev.priority;
      li.innerHTML = `<div>
        <div class="title"></div>
        <div class="when"></div>
      </div>
      <div class="actions"><button data-act="del">✕</button></div>`;
      li.querySelector(".title").textContent = ev.title;
      li.querySelector(".when").textContent =
        `${ev.start_at.replace("T"," ").slice(0,16)} · ${Priority.label(ev.priority)}`;
      li.querySelector('[data-act="del"]').onclick = () => {
        if (confirm(`取消「${ev.title}」？`)) {
          Store.remove(ev.id);
          Anim.destroy(li);          // [V2-19]
          Anim.buzz(20);
        }
      };
      list.appendChild(li);
      Anim.fadeIn(li, { delay: i * 40 });  // [V2-20]
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
  }
  function saveSettings() {
    localStorage.setItem("talkcal.llm.base", $("setLlmBase").value.trim());
    localStorage.setItem("talkcal.llm.key", $("setLlmKey").value.trim());
    localStorage.setItem("talkcal.llm.model", $("setLlmModel").value.trim() || "deepseek-chat");
    localStorage.setItem("talkcal.sb.url", $("setSbUrl").value.trim());
    localStorage.setItem("talkcal.sb.key", $("setSbKey").value.trim());
    localStorage.setItem("talkcal.lead", $("setLeadMin").value);
    localStorage.setItem("talkcal.eval.threshold", $("setEvalThreshold").value);
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
  });
})();
