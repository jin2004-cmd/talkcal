/* toast.js - V2.1-05 撤销 toast
 * 用法：Toast.show({ text, undo: async () => {...}, duration: 5000 })
 * 底部弹一条，5 秒自动消失，带[撤销]按钮。
 */
window.Toast = (function () {
  let root = null;
  let timer = null;

  function ensureRoot() {
    if (root) return root;
    root = document.createElement("div");
    root.id = "toastRoot";
    root.style.cssText = "position:fixed;left:50%;bottom:80px;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;";
    document.body.appendChild(root);
    return root;
  }

  function show({ text, undo, duration = 5000 }) {
    const r = ensureRoot();
    clearTimeout(timer);

    // 如果已有旧 toast，直接清掉（一次只弹一条）
    r.innerHTML = "";

    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<span class="toast-text"></span>`;
    if (undo) {
      const btn = document.createElement("button");
      btn.className = "toast-undo";
      btn.textContent = "撤销";
      t.appendChild(btn);
    }
    t.querySelector(".toast-text").textContent = text;
    t.style.pointerEvents = "auto";
    r.appendChild(t);

    // 入场动画
    requestAnimationFrame(() => t.classList.add("show"));

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      t.classList.remove("show");
      setTimeout(() => t.remove(), 200);
    };

    if (undo) {
      t.querySelector(".toast-undo").onclick = async () => {
        try { await undo(); } catch (e) { console.warn(e); }
        dismiss();
      };
    }

    timer = setTimeout(dismiss, duration);
    return dismiss;
  }

  return { show };
})();
