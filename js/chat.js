/* chat.js - 对话面板 [V2.3-01] 改为 FAB + 底部升起面板 */
window.Chat = (function () {
  let panel, overlay, fab, input, log;

  function init() {
    panel = document.getElementById("chatPanel");
    overlay = document.getElementById("chatOverlay");
    fab = document.getElementById("chatFab");
    input = document.getElementById("chatInput");
    log = document.getElementById("chatLog");
    const form = document.getElementById("chatForm");
    const closeBtn = document.getElementById("chatClose");

    // 应用机器人头像和名字
    if (window.Bots) Bots.apply();

    // [V2.3-01] FAB 打开面板
    fab.addEventListener("click", (e) => {
      // 如果是拖拽结束的 click，不打开
      if (fab.dataset.dragged === "1") {
        fab.dataset.dragged = "";
        return;
      }
      openPanel();
    });
    closeBtn.addEventListener("click", closePanel);
    overlay.addEventListener("click", closePanel);

    // [V2.3-01] FAB 拖拽
    makeDraggable(fab);

    // [V2.2] 首次打开欢迎气泡（面板未打开时也先记着，打开时能看到）
    if (!localStorage.getItem("talkcal.welcomed")) {
      addBubble("ai", "👋 你好，我是" + (Bots.currentName() || "小谈") + "。直接说一句就行，比如「后天下午3点交论文，很急」，我会自动帮你排进日历。");
      localStorage.setItem("talkcal.welcomed", "1");
    }

    // [V2.2] 快捷指令 chips：点一下自动填进输入框并发送
    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        input.value = chip.dataset.q;
        form.requestSubmit();
      });
    });

    // [V2.2] 键盘快捷键：/ 聚焦输入框，Esc 失焦/关闭面板
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== input && !panel.classList.contains("show")) {
        e.preventDefault();
        openPanel();
      }
      if (e.key === "Escape") {
        if (document.activeElement === input) input.blur();
        else if (panel.classList.contains("show")) closePanel();
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      addBubble("user", text);

      // [V2-22] 发送按钮 loading + 输入框 disable
      const sendBtn = form.querySelector("button[type=submit]");
      sendBtn.classList.add("loading");
      input.disabled = true;
      const restore = () => { sendBtn.classList.remove("loading"); input.disabled = false; input.focus(); };

      // [V2-23] 打字机气泡
      const typing = addBubble("ai", "正在安排");
      typing.classList.add("typing");

      // 调用 LLM 解析
      let parsed;
      try {
        parsed = await window.LLM.parse(text);
      } catch (err) {
        typing.remove();
        addBubble("ai", "解析失败：" + err.message);
        sendBtn.classList.remove("loading");
        input.disabled = false;
        input.focus();
        return;
      }
      typing.remove();
      if (parsed._degraded) addBubble("ai", "⚠️ " + parsed._degraded);

      // [V2.1-01] 四意图分发：query / cancel / reschedule / create
      if (parsed.action === "query") {
        const upcoming = Store.list({}).slice(0, 8);
        addBubble("ai", upcoming.length
          ? "接下来安排了：\n" + upcoming.map((e) => `· ${e.start_at.slice(5,16)} ${e.title}`).join("\n")
          : "你目前还没有安排。点我就能排上。");
        restore(); return;
      }

      if (parsed.action === "cancel" || parsed.action === "reschedule") {
        const kw = (parsed.target || parsed.title || "").slice(0, 6);
        const hits = Store.list({}).filter((e) =>
          !e.id.startsWith("__") && (e.title.includes(kw) || kw.includes(e.title.slice(0,4)))
        );

        if (hits.length === 0) {
          addBubble("ai", `没找到包含「${kw}」的事项。你可以先看看日历，或者说得更完整一点。`);
          restore(); return;
        }

        if (hits.length === 1) {
          await applyIntent(parsed, hits[0]);
          restore(); return;
        }

        // 多条匹配 → 弹候选卡片让用户选
        const bub = addBubble("ai", `找到 ${hits.length} 个「${kw}」相关的，你指的是哪个？`);
        const list = document.createElement("div");
        list.className = "cand-list";
        hits.slice(0, 4).forEach((ev) => {
          const b = document.createElement("button");
          b.className = "cand";
          b.textContent = `${ev.start_at.slice(5,16)} · ${ev.title}`;
          b.onclick = async () => {
            list.remove();
            await applyIntent(parsed, ev);
          };
          list.appendChild(b);
        });
        bub.appendChild(list);
        restore(); return;
      }

      // create → 过质量门
      const existing = Store.list({});
      const threshold = parseFloat(localStorage.getItem("talkcal.eval.threshold") || "7");
      const result = await EvalGate.run({
        threshold,
        maxRetries: 2,
        ctx: { existing },
        generate: async (i, lastErr) => {
          if (i === 0) return parsed;
          // 重试时让 LLM 知道上次哪里错了
          const retryPrompt = text + `\n（上次解析被打回：${lastErr}。请修正后重新输出 JSON。）`;
          return window.LLM.parse(retryPrompt);
        },
      });

      if (!result.best) {
        addBubble("ai", "连续几次都没排好，先不写入。错误：" + (result.tries.at(-1)?.l1?.join("；") || "未知"));
        restore(); return;
      }
      const ev = result.best;
      const pClass = ev.priority === "high" ? "priority-hi" : ev.priority === "low" ? "priority-lo" : "priority-med";
      const bubble = document.createElement("div");
      bubble.className = "bubble ai " + pClass;
      bubble.innerHTML = `
        <div><strong>${escapeHtml(ev.title)}</strong></div>
        <div>🕐 ${ev.start_at.replace("T", " ").slice(0,16)} → ${(ev.end_at||"").replace("T"," ").slice(11,16)||""}</div>
        <div>🎯 ${Priority.label(ev.priority)} · ${ev.category||"life"}</div>
        ${result.passed ? "" : `<div style="color:#f59e0b">⚠️ 质量门未达标，已取历史最佳（得分 ${ev._score||"?"}）</div>`}
        <button class="confirm">✅ 加入日历</button>`;
      bubble.querySelector(".confirm").onclick = async () => {
        const created = await Store.create(ev);
        if (window.Confetti) Confetti.burst();       // 加入也小庆祝
        if (window.Anim) Anim.buzz(10);
        bubble.querySelector(".confirm").remove();
        const done = document.createElement("div");
        done.style.cssText = "color:#10b981;font-size:13px;margin-top:4px";
        done.textContent = "已加入 ✔";
        bubble.appendChild(done);
        // [V2.1-05] 撤销 toast
        if (window.Toast) {
          Toast.show({
            text: `已加入「${ev.title}」`,
            undo: async () => { await Store.remove(created.id); }
          });
        }
      };
      log.appendChild(bubble);
      log.scrollTop = log.scrollHeight;

      restore();
    });

    // [V2.1-01] 执行 cancel / reschedule 的实际动作
    async function applyIntent(parsed, ev) {
      if (parsed.action === "cancel") {
        await Store.remove(ev.id);
        addBubble("ai", `已取消「${ev.title}」（${ev.start_at.slice(5,16)}）。`);
        if (window.Toast) {
          Toast.show({
            text: `已取消「${ev.title}」`,
            undo: async () => { await Store.update(ev.id, { status: "scheduled" }); }
          });
        }
      } else if (parsed.action === "reschedule") {
        const oldStart = ev.start_at;
        await Store.update(ev.id, {
          start_at: parsed.start_at,
          end_at: parsed.end_at,
        });
        addBubble("ai", `已把「${ev.title}」从 ${oldStart.slice(5,16)} 改到 ${parsed.start_at.slice(5,16)}。`);
        if (window.Toast) {
          Toast.show({
            text: `已改期「${ev.title}」`,
            undo: async () => { await Store.update(ev.id, { start_at: oldStart, end_at: ev.end_at }); }
          });
        }
      }
    }
  }

  function openPanel() {
    panel.hidden = false;
    overlay.hidden = false;
    requestAnimationFrame(() => {
      panel.classList.add("show");
      overlay.classList.add("show");
    });
    document.body.classList.add("chat-open");
    setTimeout(() => input.focus(), 280);
  }
  function closePanel() {
    panel.classList.remove("show");
    overlay.classList.remove("show");
    document.body.classList.remove("chat-open");
    setTimeout(() => { panel.hidden = true; overlay.hidden = true; }, 280);
  }

  // [V2.3-01] FAB 拖拽（pointer events，鼠标触屏通用）
  function makeDraggable(el) {
    let startX, startY, origX, origY, moved = false;
    el.addEventListener("pointerdown", (e) => {
      // 只响应左键/触屏
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const rect = el.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      origX = rect.left; origY = rect.top;
      moved = false;
      el.setPointerCapture(e.pointerId);
      el.classList.add("dragging");
    });
    el.addEventListener("pointermove", (e) => {
      if (startX === undefined) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      if (moved) {
        const nx = Math.max(8, Math.min(window.innerWidth - rect.width - 8, origX + dx));
        const ny = Math.max(8, Math.min(window.innerHeight - rect.height - 8, origY + dy));
        el.style.right = "auto";
        el.style.bottom = "auto";
        el.style.left = nx + "px";
        el.style.top = ny + "px";
      }
    });
    el.addEventListener("pointerup", (e) => {
      el.releasePointerCapture(e.pointerId);
      el.classList.remove("dragging");
      if (moved) {
        el.dataset.dragged = "1";
        // 持久化位置
        const rect = el.getBoundingClientRect();
        localStorage.setItem("talkcal.fab.x", String(rect.left));
        localStorage.setItem("talkcal.fab.y", String(rect.top));
      }
      startX = undefined;
    });
    // 恢复上次位置
    const sx = localStorage.getItem("talkcal.fab.x");
    const sy = localStorage.getItem("talkcal.fab.y");
    if (sx && sy) {
      el.style.right = "auto"; el.style.bottom = "auto";
      el.style.left = sx + "px"; el.style.top = sy + "px";
    }
  }

  function addBubble(kind, text) {
    const b = document.createElement("div");
    b.className = "bubble " + kind;
    b.textContent = text;
    log.appendChild(b);
    // [V2-31] 防止日志无限增长：只保留最近 50 条
    while (log.children.length > 50) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
    return b;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  return { init, open: openPanel, close: closePanel };
})();
