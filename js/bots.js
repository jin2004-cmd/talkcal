/* bots.js - [V2.3-03] 原创可爱机器人头像库
 * 4 个 SVG 机器人，避免版权问题。
 * 每个 avatar 返回一段 innerHTML，可塞到 FAB / 面板头 / 设置选择器。
 */
window.Bots = (function () {
  // 4 个机器人：圆头豆豆、方头工程师、天线探索者、戴耳机音乐人
  const BOTS = {
    bean: {
      name: "豆豆",
      svg: `<svg viewBox="0 0 48 48" width="100%" height="100%">
        <circle cx="24" cy="26" r="16" fill="#a78bfa"/>
        <circle cx="18" cy="24" r="2.5" fill="#fff"/>
        <circle cx="30" cy="24" r="2.5" fill="#fff"/>
        <path d="M20 30 Q24 33 28 30" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <rect x="20" y="8" width="8" height="4" rx="2" fill="#a78bfa"/>
        <circle cx="24" cy="7" r="2" fill="#f472b6"/>
      </svg>`
    },
    box: {
      name: "方方",
      svg: `<svg viewBox="0 0 48 48" width="100%" height="100%">
        <rect x="10" y="12" width="28" height="24" rx="6" fill="#38bdf8"/>
        <circle cx="19" cy="22" r="2.5" fill="#0f172a"/>
        <circle cx="29" cy="22" r="2.5" fill="#0f172a"/>
        <rect x="18" y="28" width="12" height="2" rx="1" fill="#0f172a"/>
        <rect x="22" y="6" width="4" height="6" fill="#38bdf8"/>
        <circle cx="24" cy="5" r="2" fill="#fbbf24"/>
      </svg>`
    },
    ant: {
      name: "探探",
      svg: `<svg viewBox="0 0 48 48" width="100%" height="100%">
        <ellipse cx="24" cy="28" rx="14" ry="13" fill="#34d399"/>
        <circle cx="19" cy="26" r="2.2" fill="#0f172a"/>
        <circle cx="29" cy="26" r="2.2" fill="#0f172a"/>
        <path d="M20 32 Q24 35 28 32" stroke="#0f172a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <line x1="24" y1="15" x2="24" y2="8" stroke="#34d399" stroke-width="2"/>
        <circle cx="24" cy="6" r="2.5" fill="#fb7185"/>
      </svg>`
    },
    headphones: {
      name: "听听",
      svg: `<svg viewBox="0 0 48 48" width="100%" height="100%">
        <circle cx="24" cy="26" r="14" fill="#f472b6"/>
        <path d="M10 26 a14 14 0 0 1 28 0" stroke="#1e293b" stroke-width="2.5" fill="none"/>
        <rect x="8" y="24" width="5" height="9" rx="2" fill="#1e293b"/>
        <rect x="35" y="24" width="5" height="9" rx="2" fill="#1e293b"/>
        <circle cx="19" cy="26" r="2" fill="#fff"/>
        <circle cx="29" cy="26" r="2" fill="#fff"/>
        <path d="M21 31 Q24 33 27 31" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      </svg>`
    }
  };

  function list() {
    return Object.keys(BOTS).map((k) => ({ id: k, name: BOTS[k].name }));
  }
  function svg(id) {
    return (BOTS[id] || BOTS.bean).svg;
  }
  function name(id) {
    return (BOTS[id] || BOTS.bean).name;
  }
  function currentId() {
    return localStorage.getItem("talkcal.bot.avatar") || "bean";
  }
  function currentName() {
    return localStorage.getItem("talkcal.bot.name") || "小谈";
  }
  function apply() {
    const id = currentId();
    const nm = currentName();
    const f = document.getElementById("fabAvatar");
    const p = document.getElementById("panelAvatar");
    const t = document.getElementById("botNameTitle");
    if (f) f.innerHTML = svg(id);
    if (p) p.innerHTML = svg(id);
    if (t) t.textContent = nm;
  }

  return { list, svg, name, apply, currentId, currentName };
})();
