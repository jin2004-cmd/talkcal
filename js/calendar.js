/* calendar.js - 月视图渲染 */
window.CalendarView = (function () {
  let viewYear, viewMonth;   // 0-11
  let selectedDate;          // Date (start of day)
  let events = [];

  function init() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    selectedDate = startOfDay(now);
    document.getElementById("prevMonth").onclick = () => shift(-1);
    document.getElementById("nextMonth").onclick = () => shift(1);
    document.getElementById("todayBtn").onclick = () => {
      const n = new Date();
      viewYear = n.getFullYear(); viewMonth = n.getMonth();
      selectedDate = startOfDay(n);
      render();
    };
    window.Store.onChange((evs) => { events = evs; render(); });
    render();
  }

  function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
  // 本地日期字符串，避免 toISOString 转 UTC 导致东八区日期偏移一天
  function localDateStr(d) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function shift(delta) {
    viewMonth += delta;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    render(delta > 0 ? "next" : "prev");   // [V2-13]
  }

  function eventsOn(dateStr) {
    return events.filter((e) => e.start_at && e.start_at.slice(0,10) === dateStr && e.status !== "cancelled");
  }

  function render(direction) {
    document.getElementById("monthTitle").textContent = `${viewYear} 年 ${viewMonth + 1} 月`;
    const grid = document.getElementById("calendarGrid");
    grid.innerHTML = "";
    // [V2-13] 月份切换方向动画
    grid.classList.remove("month-next", "month-prev");
    if (direction) {
      // 强制 reflow 后再加 class，确保动画重放
      void grid.offsetWidth;
      grid.classList.add(direction === "next" ? "month-next" : "month-prev");
    }

    const first = new Date(viewYear, viewMonth, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

    const todayStr = localDateStr(new Date());
    const selectedStr = localDateStr(selectedDate);

    // 前置补上月
    for (let i = startWeekday - 1; i >= 0; i--) {
      grid.appendChild(makeCell(daysInPrev - i, true));
    }
    // 当月
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${viewYear}-${pad(viewMonth+1)}-${pad(d)}`;
      const cell = makeCell(d, false);
      if (ds === todayStr) cell.classList.add("today");
      if (ds === selectedStr) cell.classList.add("selected");
      // 圆点
      const dayEvents = eventsOn(ds);
      if (dayEvents.length) {
        const dots = document.createElement("div");
        dots.className = "dots";
        const prios = [...new Set(dayEvents.map((e) => e.priority))];
        prios.slice(0,3).forEach((p) => {
          const dot = document.createElement("span");
          dot.className = "dot " + p;
          dots.appendChild(dot);
        });
        cell.appendChild(dots);
      }
      cell.onclick = () => { selectedDate = new Date(ds + "T00:00:00"); render(); };
      grid.appendChild(cell);
    }
    // 后置补下月
    const totalCells = startWeekday + daysInMonth;
    const tail = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= tail; i++) grid.appendChild(makeCell(i, true));

    renderAgenda();
  }

  function makeCell(num, otherMonth) {
    const b = document.createElement("button");
    b.className = "day-cell" + (otherMonth ? " other-month" : "");
    b.textContent = num;
    if (window.Anim) Anim.press(b);   // [V2-14]
    return b;
  }

  function renderAgenda() {
    const ds = localDateStr(selectedDate);
    document.getElementById("agendaTitle").textContent =
      ds === localDateStr(new Date()) ? "今天" : ds;
    const list = document.getElementById("agendaList");
    const empty = document.getElementById("agendaEmpty");
    list.innerHTML = "";
    const dayEvents = eventsOn(ds).sort((a,b) => a.start_at.localeCompare(b.start_at));
    empty.style.display = dayEvents.length ? "none" : "block";
    dayEvents.forEach((ev, i) => {
      const li = document.createElement("li");
      li.className = "p-" + ev.priority;
      li.innerHTML = `
        <div>
          <div class="title"></div>
          <div class="when"></div>
        </div>
        <div class="actions">
          <button data-act="done" title="完成">✓</button>
          <button data-act="del" title="取消">✕</button>
        </div>`;
      li.querySelector(".title").textContent = ev.title;
      li.querySelector(".when").textContent =
        `${ev.start_at.slice(11,16)} - ${(ev.end_at||"").slice(11,16)||""} · ${Priority.label(ev.priority)}`;
      // [V2-18] 完成：彩炮 + 震动 + 收缩
      li.querySelector('[data-act="done"]').onclick = () => {
        if (window.Confetti) Confetti.burst();
        if (window.Anim) Anim.buzz(15);
        Store.update(ev.id, { status: "done" });
      };
      // [V2-19] 取消：抖动 + 消散
      li.querySelector('[data-act="del"]').onclick = () => {
        if (!confirm(`取消「${ev.title}」？`)) return;
        if (window.Anim) { Anim.shake(li); Anim.buzz(20); }
        setTimeout(() => Store.remove(ev.id), 200);
      };
      list.appendChild(li);
      if (window.Anim) Anim.fadeIn(li, { delay: i * 40 });   // [V2-20]
    });
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  return { init, render };
})();
