/* priority.js - 语气/语义 → 优先级
 * 规则词表优先命中；LLM 解析时如果没自己给 priority，这里兜底。
 * 三档：high(红) / med(黄) / low(绿)
 */
window.Priority = (function () {
  const HIGH = [
    "急", "马上", "立刻", "赶紧", "截止", "死线", "ddl", "DDL",
    "答辩", "考试", "面试", "航班", "飞机", "火车", "高铁",
    "老板", "客户", "必须", "务必", "千万", "今天必须", "马上要",
    "ASAP", "urgent", "重要"
  ];
  const LOW = [
    "有空", "随便", "看看", "以后", "不急", "想着", "想起来",
    "哪天", "有空再", "随缘", "方便时", "以后再说"
  ];
  const MED = [
    "记得", "安排", "约", "准备", "写", "交", "会议", "报告",
    "健身", "吃饭", "逛街", "买", "取", "送", "下周", "本周"
  ];

  function infer(text, already) {
    if (already && ["high", "med", "low"].includes(already)) return already;
    const t = (text || "").toLowerCase();
    let score = 0;
    for (const w of HIGH) if (t.includes(w.toLowerCase())) score += 2;
    for (const w of LOW) if (t.includes(w.toLowerCase())) score -= 2;
    for (const w of MED) if (t.includes(w.toLowerCase())) score += 0.5;
    if (score >= 1.5) return "high";
    if (score <= -1) return "low";
    return "med";
  }

  function label(p) {
    return { high: "🔴 高", med: "🟡 中", low: "🟢 低" }[p] || "🟡 中";
  }

  return { infer, label };
})();
