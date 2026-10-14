/* chat.js - 对话坞 */
window.Chat = (function () {
  function init() {
    const form = document.getElementById("chatForm");
    const log = document.getElementById("chatLog");
    const input = document.getElementById("chatInput");

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

      // 命令类
      if (parsed.action === "query") {
        const upcoming = Store.list({}).slice(0, 5);
        addBubble("ai", upcoming.length
          ? "接下来安排了：\n" + upcoming.map((e) => `· ${e.start_at.slice(5,16)} ${e.title}`).join("\n")
          : "你目前还没有安排。");
        restore(); return;
      }
      if (parsed.action === "cancel") {
        const kw = (parsed.target || parsed.title || "").slice(0, 6);
        const hit = Store.list({}).find((e) => e.title.includes(kw));
        if (hit) {
          await Store.remove(hit.id);
          addBubble("ai", `已取消「${hit.title}」（其他设备会同步消失，未来提醒也会取消）。`);
        } else {
          addBubble("ai", `没找到包含「${kw}」的事项，要取消的话告诉我更完整的标题。`);
        }
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
        await Store.create(ev);
        if (window.Confetti) Confetti.burst();       // 加入也小庆祝
        if (window.Anim) Anim.buzz(10);
        bubble.querySelector(".confirm").remove();
        const done = document.createElement("div");
        done.style.cssText = "color:#10b981;font-size:13px;margin-top:4px";
        done.textContent = "已加入 ✔";
        bubble.appendChild(done);
      };
      log.appendChild(bubble);
      log.scrollTop = log.scrollHeight;

      restore();
    });
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
