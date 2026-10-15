/* chat.js - 对话坞 */
window.Chat = (function () {
  function init() {
    const form = document.getElementById("chatForm");
    const log = document.getElementById("chatLog");
    const input = document.getElementById("chatInput");

    // [V2.2] 首次打开欢迎气泡
    if (!localStorage.getItem("talkcal.welcomed")) {
      addBubble("ai", "👋 我是 TalkCal。直接说一句就行，比如「后天下午3点交论文，很急」，我会自动帮你排进日历。");
      localStorage.setItem("talkcal.welcomed", "1");
    }

    // [V2.2] 快捷指令 chips：点一下自动填进输入框并发送
    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        input.value = chip.dataset.q;
        form.requestSubmit();
      });
    });

    // [V2.2] 键盘快捷键：/ 聚焦输入框，Esc 失焦
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== input) {
        e.preventDefault();
        input.focus();
      }
      if (e.key === "Escape" && document.activeElement === input) {
        input.blur();
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
          : "你目前还没有安排。在下方说一句就能排上。");
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

  function addBubble(kind, text) {
    const log = document.getElementById("chatLog");
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

  return { init };
})();
