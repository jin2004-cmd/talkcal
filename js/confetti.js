/* confetti.js - V2 彩炮 [V2-11, V2-12]
 * 零依赖 canvas 实现，完成事项时调用 Confetti.burst()。
 */
window.Confetti = (function () {
  let canvas = null;
  let ctx = null;
  let pieces = [];
  let raf = null;

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
  }
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function burst(colors) {
    if (window.Anim && Anim.isReduced()) return;
    ensureCanvas();
    const w = canvas.width, h = canvas.height;
    const palette = colors || ["#ef4444", "#f59e0b", "#10b981", "#38bdf8", "#a78bfa"];
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      pieces.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        color: palette[Math.floor(Math.random() * palette.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1,
      });
    }
    if (!raf) tick();
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces = pieces.filter((p) => p.life > 0);
    for (const p of pieces) {
      p.vy += 0.25;        // 重力
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.012;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (pieces.length > 0) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  return { burst };
})();
