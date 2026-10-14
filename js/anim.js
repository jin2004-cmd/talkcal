/* anim.js - V2 动效基础设施 [V2-04..V2-10, V2-28, V2-29]
 * 所有动效只动 transform/opacity；prefers-reduced-motion 自动短路。
 */
window.Anim = (function () {
  const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

  function isReduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // [V2-04] 按下反馈：scale(0.96)
  function press(el) {
    if (!el || isReduced()) return;
    el.style.transition = "transform 120ms " + EASE;
    const onDown = () => { el.style.transform = "scale(0.96)"; };
    const onUp = () => { el.style.transform = ""; };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onUp);
  }

  // [V2-05] stagger 入场
  function fadeIn(el, { delay = 0, from = "translateY(8px)" } = {}) {
    if (!el) return;
    if (isReduced()) { el.style.opacity = 1; return; }
    el.style.willChange = "transform, opacity";
    el.style.opacity = 0;
    el.style.transform = from;
    el.style.transition = `opacity 280ms ${EASE} ${delay}ms, transform 280ms ${EASE} ${delay}ms`;
    requestAnimationFrame(() => {
      el.style.opacity = 1;
      el.style.transform = "translateY(0)";
    });
    setTimeout(() => {
      el.style.willChange = "auto";
      el.style.transition = "";
    }, 280 + delay + 50);
  }

  // [V2-06] 数字滚动
  function rollNumber(el, to) {
    if (!el) return;
    const from = parseInt(el.textContent) || 0;
    if (from === to || isReduced()) { el.textContent = to; return; }
    const start = performance.now();
    const dur = 500;
    function tick(t) {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // [V2-07] 抖动
  function shake(el) {
    if (!el || isReduced()) return;
    el.style.transition = "transform 80ms ease-in-out";
    let i = 0;
    const dirs = [-8, 8, -6, 6, -3, 3, 0];
    const id = setInterval(() => {
      el.style.transform = `translateX(${dirs[i] || 0}px)`;
      i++;
      if (i >= dirs.length) { clearInterval(id); el.style.transition = ""; el.style.transform = ""; }
    }, 60);
  }

  // [V2-08] 碎裂消散（取消用）
  function destroy(el) {
    if (!el) return;
    if (isReduced()) { el.remove(); return; }
    el.style.willChange = "transform, opacity, filter";
    el.style.transition = "opacity 300ms ease-in, transform 300ms ease-in, filter 300ms ease-in";
    el.style.opacity = 0;
    el.style.transform = "scale(0.85) translateY(10px)";
    el.style.filter = "blur(4px)";
    setTimeout(() => el.remove(), 320);
  }

  // [V2-18] 完成：收缩
  function collapse(el) {
    if (!el) return;
    if (isReduced()) { el.remove(); return; }
    el.style.transition = "opacity 250ms ease, transform 250ms ease, max-height 250ms ease, margin 250ms ease, padding 250ms ease";
    el.style.opacity = 0;
    el.style.transform = "scale(0.9)";
    el.style.maxHeight = el.offsetHeight + "px";
    requestAnimationFrame(() => {
      el.style.maxHeight = "0";
      el.style.marginBottom = "0";
      el.style.paddingTop = "0";
      el.style.paddingBottom = "0";
    });
    setTimeout(() => el.remove(), 280);
  }

  // [V2-28] 震动反馈
  function buzz(ms = 10) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch {} }
  }

  return { isReduced, press, fadeIn, rollNumber, shake, destroy, collapse, buzz, EASE };
})();
