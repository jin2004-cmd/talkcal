/* calendar.js - 月视图渲染 */
window.CalendarView = (function () {
  let viewYear, viewMonth;
  let selectedDate;
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
  function localDateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

  function shift(delta) {
    viewMonth += delta;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    render(delta > 0 ? "next" : "prev");
  }

  function eventsOn(dateStr) {
    return events.filter((e) => e.start_at && e.start_at.slice(0,10) === dateStr && e.status !== "cancelled");
  }

  function render(direction) {
    document.getElementById("monthTitle").textContent = `${viewYear} 年 ${viewMonth + 1} 月`;
    const grid = document.getElementById("calendarGrid");
    grid.innerHTML = "";
    grid.classList.remove("month-next", "month-prev");
    if (direction) { void grid.offsetWidth; grid.classList.add(direction === "next" ? "month-next" : "month-prev"); }
    const first = new Date(viewYear, viewMonth, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
    const todayStr = localDateStr(new Date());
    const selectedStr = localDateStr(selectedDate);

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, daysInPrev - i);
      grid.appendChild(makeCell(daysInPrev - i, true, localDateStr(d)));
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${viewYear}-${pad(viewMonth+1)}-${pad(d)}`;
      const cell = makeCell(d, false, ds);
      if (ds === todayStr) cell.classList.add("today");
      if (ds === selectedStr) cell.classList.add("selected");
      const dayEvents = eventsOn(ds);
      if (dayEvents.length) {
        const dots = document.createElement("div");
        dots.className = "dots";
        const prios = [...new Set(dayEvents.map((e) => e.priority))];
        prios.slice(0,3).forEach((p) => { const dot = document.createElement("span"); dot.className = "dot " + p; dots.appendChild(dot); });
        cell.appendChild(dots);
      }
      cell.onclick = () => { selectedDate = new Date(ds + "T00:00:00"); render(); };
      grid.appendChild(cell);
    }
    const totalCells = startWeekday + daysInMonth;
    const tail = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= tail; i++) grid.appendChild(makeCell(i, true));
    renderAgenda();
    renderTodayStrip();
  }

  function renderTodayStrip() {
    const strip = document.getElementById("todayStrip");
    if (!strip) return;
    const todayStr = localDateStr(new Date());
    const todays = eventsOn(todayStr).filter((e) => e.status !== "done").sort((a, b) => a.start_at.localeCompare(b.start_at));
    const now = new Date();
    const upcoming = todays.filter((e) => new Date(e.start_at) >= now);
    const next = upcoming[0];
    if (todays.length === 0) strip.innerHTML = `<span class="none">今天还没有安排，在下方说一句吧</span><span>›</span>`;
    else if (!next) strip.innerHTML = `<span class="next">今天 ${todays.length} 件事，都搞完啦 🎉</span><span>›</span>`;
    else {
      const diffMin = Math.round((new Date(next.start_at) - now) / 60000);
      const when = diffMin < 60 ? `${diffMin} 分钟后` : `${Math.floor(diffMin / 60)} 小时 ${diffMin % 60} 分后`;
      strip.innerHTML = `<span>今天 ${todays.length} 件事 · 下一个 <span class="next">${next.title}</span>（${when}）</span><span>›</span>`;
    }
    strip.onclick = () => { const ag = document.querySelector(".agenda-panel"); if (ag) ag.scrollIntoView({ behavior: "smooth", block: "start" }); };
  }

  function makeCell(num, otherMonth, dateStr) {
    const b = document.createElement("button");
    b.className = "day-cell" + (otherMonth ? " other-month" : "");
    b.textContent = num;
    if (dateStr) b.dataset.date = dateStr;
    if (window.Anim) Anim.press(b);
    return b;
  }

  function renderAgenda() {
    const ds = localDateStr(selectedDate);
    document.getElementById("agendaTitle").textContent = ds === localDateStr(new Date()) ? "今天" : ds;
    const list = document.getElementById("agendaList");
    const empty = document.getElementById("agendaEmpty");
    list.innerHTML = "";
    const dayEvents = eventsOn(ds).sort((a,b) => a.start_at.localeCompare(b.start_at));
    empty.style.display = dayEvents.length ? "none" : "block";
    dayEvents.forEach((ev, i) => {
      const li = document.createElement("li");
      li.className = "p-" + ev.priority;
      li.innerHTML = `<div><div class="title"></div><div class="when"></div></div><div class="actions"><button data-act="done" title="完成">✓</button><button data-act="del" title="取消">✕</button></div>`;
      li.querySelector(".title").textContent = ev.title;
      li.querySelector(".when").textContent = `${ev.start_at.slice(11,16)} - ${(ev.end_at||"").slice(11,16)||""} · ${Priority.label(ev.priority)}`;
      li.querySelector('[data-act="done"]').onclick = () => {
        if (window.Confetti) Confetti.burst();
        if (window.Anim) Anim.buzz(15);
        Store.update(ev.id, { status: "done" });
        if (window.Toast) Toast.show({ text: `完成「${ev.title}」🎉`, undo: async () => { await Store.update(ev.id, { status: "scheduled" }); } });
      };
      li.querySelector('[data-act="del"]').onclick = () => {
        if (window.Anim) { Anim.shake(li); Anim.buzz(20); }
        setTimeout(async () => { await Store.remove(ev.id); if (window.Toast) Toast.show({ text: `已取消「${ev.title}」`, undo: async () => { await Store.update(ev.id, { status: "scheduled" }); } }); }, 200);
      };
      if (ev.status === "done") li.classList.add("done");
      list.appendChild(li);
      if (window.Anim) Anim.fadeIn(li, { delay: i * 40 });
    });
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function jumpTo(ymd) {
    const [y, m, d] = ymd.split("-").map(Number);
    viewYear = y; viewMonth = m - 1;
    selectedDate = new Date(ymd + "T00:00:00");
    render();
  }

  return { init, render, jumpTo };
})();
