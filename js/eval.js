/* eval.js - LLM 输出质量门
 * 双层：
 *   L1 确定性规则校验（不依赖模型）
 *   L2 LLM-as-Judge 打分（可选；没配 Key 用启发式评分）
 * 不达标自动重试，全程写日志。
 *
 * 用法：
 *   const res = await EvalGate.run({
 *     generate: () => llm.parse(userText, ctx),   // 返回 event 对象或 null
 *     judge: (event) => llm.judge(event),          // 可选；返回 0-10
 *     threshold: 7,
 *     maxRetries: 2,
 *   });
 *   res.ok / res.event / res.logs
 */
window.EvalGate = (function () {
  const logs = [];

  function L1(event, ctx) {
    const errors = [];
    if (!event || typeof event !== "object") return ["模型没返回结构化对象"];
    if (!event.title || !String(event.title).trim()) errors.push("缺 title");
    if (!event.start_at || isNaN(Date.parse(event.start_at))) errors.push("start_at 不是合法时间");
    if (event.end_at) {
      if (isNaN(Date.parse(event.end_at))) errors.push("end_at 不合法");
      else if (Date.parse(event.end_at) < Date.parse(event.start_at)) errors.push("end_at 早于 start_at");
    }
    // 时长检查
    if (event.start_at && event.end_at) {
      const durMin = (Date.parse(event.end_at) - Date.parse(event.start_at)) / 60000;
      if (durMin < 5) errors.push(`时长 ${durMin.toFixed(0)} 分钟太短（<5min）`);
      if (durMin > 8 * 60) errors.push(`时长 ${(durMin/60).toFixed(1)}h 太长（>8h）`);
    }
    // 优先级枚举
    if (event.priority && !["high", "med", "low"].includes(event.priority)) {
      errors.push(`priority=${event.priority} 不在枚举内`);
    }
    // 不能是过去太久的时间（超过 1 小时前）
    if (event.start_at) {
      const diff = Date.parse(event.start_at) - Date.now();
      if (diff < -60 * 60 * 1000) errors.push(`开始时间在 ${Math.abs(diff/3600000).toFixed(1)} 小时前，过去太久`);
    }
    // 冲突检测（同日同时间段已有 scheduled 事件）
    if (ctx && Array.isArray(ctx.existing) && event.start_at && event.end_at) {
      const s = Date.parse(event.start_at), e = Date.parse(event.end_at);
      for (const ex of ctx.existing) {
        if (ex.status === "cancelled") continue;
        const es = Date.parse(ex.start_at), ee = Date.parse(ex.end_at || ex.start_at);
        if (s < ee && es < e) {
          errors.push(`与「${ex.title}」时间冲突（${ex.start_at.slice(11,16)}-${(ex.end_at||'').slice(11,16)||''}）`);
        }
      }
    }
    return errors;
  }

  function heuristicScore(event) {
    // 没配 LLM judge 时的兜底打分
    let score = 7;
    if (event.title && event.title.length >= 4) score += 0.5;
    if (event.priority) score += 0.5;
    if (event.note) score += 0.5;
    if (event.end_at) score += 0.5;
    return Math.min(10, score);
  }

  async function run({ generate, judge, threshold = 7, maxRetries = 2, ctx = {} }) {
    const log = { tries: [], passed: false, best: null };
    let lastErr = null;
    for (let i = 0; i <= maxRetries; i++) {
      let event;
      try { event = await generate(i, lastErr); }
      catch (e) { log.tries.push({ i, error: "generate throw: " + e.message }); continue; }
      const l1Errors = L1(event, ctx);
      if (l1Errors.length === 0) {
        let score;
        try { score = judge ? await judge(event) : heuristicScore(event); }
        catch { score = heuristicScore(event); }
        log.tries.push({ i, title: event.title, l1: "ok", score });
        if (score >= threshold) {
          log.passed = true;
          log.best = event;
          break;
        } else {
          lastErr = `L2 评分 ${score} < ${threshold}`;
          if (!log.best || (score > (log.best._score || 0))) {
            event._score = score; log.best = event;
          }
        }
      } else {
        log.tries.push({ i, title: event && event.title, l1: l1Errors });
        lastErr = l1Errors.join("；");
      }
    }
    logs.push(log);
    return log;
  }

  function dump() { return logs.slice(); }
  function clear() { logs.length = 0; }

  return { run, L1, dump, clear };
})();
