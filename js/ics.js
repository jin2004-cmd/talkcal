/* ics.js - V2.1-03 把所有事项导出成 .ics 文件（RFC 5545）
 * 带 VALARM，提前 N 分钟提醒。导入手机系统日历就能响铃。
 */
window.Ics = (function () {
  function pad(n) { return String(n).padStart(2, "0"); }

  // 本地时间转 iCalendar 时间格式：YYYYMMDDTHHMMSS（不带 Z，用本地时区）
  function toIcsDT(iso) {
    // iso 形如 "2026-10-15T09:00:00"
    return iso.replace(/[-:]/g, "").slice(0, 15);
  }

  function escapeText(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  function build(events) {
    const leadMin = parseInt(localStorage.getItem("talkcal.lead") || "10", 10);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TalkCal//ZH-CN//",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    events.forEach((ev) => {
      if (ev.status === "cancelled" || ev.status === "done") return;
      lines.push("BEGIN:VEVENT");
      lines.push("UID:" + (ev.id || ev.start_at + ev.title) + "@talkcal");
      lines.push("DTSTART:" + toIcsDT(ev.start_at));
      lines.push("DTEND:" + toIcsDT(ev.end_at || ev.start_at));
      lines.push("SUMMARY:" + escapeText(ev.title));
      if (ev.note) lines.push("DESCRIPTION:" + escapeText(ev.note));
      lines.push("CATEGORIES:" + (ev.category || "life"));
      // 提前提醒
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push("DESCRIPTION:" + escapeText("提醒：" + ev.title));
      lines.push("TRIGGER:-PT" + leadMin + "M");
      lines.push("END:VALARM");
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    // iCalendar 要求 CRLF
    return lines.join("\r\n");
  }

  function download() {
    const events = Store.list({});
    if (!events.length) {
      if (window.Toast) Toast.show({ text: "还没有事项可导出", duration: 2000 });
      return;
    }
    const blob = new Blob([build(events)], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "talkcal.ics";
    a.click();
    if (window.Toast) {
      Toast.show({
        text: `已导出 ${events.length} 件事项，用手机日历打开此文件即可同步提醒`,
        duration: 6000,
      });
    }
  }

  return { download };
})();
