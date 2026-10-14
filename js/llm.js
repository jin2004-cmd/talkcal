/* llm.js - OpenAI 兼容客户端 + Mock 解析器
 * 把自然语言解析成结构化事件草稿。
 * 没配 Key 时走 Mock（规则+朴素中文时间解析），全流程可玩。
 */
window.LLM = (function () {
  let cfg = { base: "", key: "", model: "deepseek-chat" };

  function configure(c) { cfg = Object.assign({}, cfg, c); }

  function hasReal() { return !!(cfg.base && cfg.key); }

  const SYSTEM_PROMPT = `你是日程解析助手。把用户的一句话转成 JSON，不要多余解释。
当前时间：{{NOW}}
今天：{{TODAY}}

输出 JSON 字段：
- action: "create" | "cancel" | "query"
- title: 事项标题（简短中文）
- start_at: ISO 8601 本地时间
- end_at: ISO 8601 本地时间（默认 start+1h）
- priority: "high" | "med" | "low"（根据语气：很急/答辩/面试/航班→high；有空/随便→low；否则 med）
- category: "work" | "study" | "life" | "health"
- note: 备注（可选）
- target: 当 action=cancel 时，描述要取消的事项关键词

只输出 JSON。`;

  async function realParse(userText) {
    const now = new Date();
    const sys = SYSTEM_PROMPT
      .replace("{{NOW}}}", now.toISOString())
      .replace("{{NOW}}", now.toISOString())
      .replace("{{TODAY}}", now.toISOString().slice(0, 10));
    const resp = await fetch(cfg.base.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + cfg.key,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userText },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) throw new Error("LLM HTTP " + resp.status);
    const data = await resp.json();
    const txt = data.choices?.[0]?.message?.content || "{}";
    return JSON.parse(txt);
  }

  // ---- Mock 朴素解析 ----
  function mockParse(text) {
    const now = new Date();
    const target = new Date(now);
    target.setHours(9, 0, 0, 0);

    // 日期偏移
    if (/后天/.test(text)) target.setDate(target.getDate() + 2);
    else if (/明天|明日/.test(text)) target.setDate(target.getDate() + 1);
    else if (/今天|今日/.test(text)) target.setDate(target.getDate());
    else {
      const wd = text.match(/周([日一二三四五六天])/);
      if (wd) {
        const map = { "日":0,"天":0,"一":1,"二":2,"三":3,"四":4,"五":5,"六":6 };
        const want = map[wd[1]];
        const delta = (want - target.getDay() + 7) % 7;
        target.setDate(target.getDate() + (delta === 0 ? 7 : delta));
      }
    }
    if (/下周/.test(text)) target.setDate(target.getDate() + 7);

    // 时间
    let hour = 9, minute = 0;
    let m = text.match(/(上午|早上|上午)?(\d{1,2})[:点](\d{1,2})?/);
    if (m) {
      hour = parseInt(m[2], 10);
      minute = m[3] ? parseInt(m[3], 0) : 0;
      if ((/下午|傍晚|晚上|晚|pm|PM/.test(text)) && hour < 12) hour += 12;
      if ((/凌晨|早上|上午|am|AM/.test(text)) && hour === 12) hour = 0;
    } else if (/下午/.test(text)) hour = 15;
    else if (/傍晚/.test(text)) hour = 18;
    else if (/晚上/.test(text)) hour = 20;
    target.setHours(hour, minute, 0, 0);

    // action
    let action = "create";
    if (/取消|删掉|不用了|取消掉/.test(text)) action = "cancel";
    else if (/有啥|安排了什么|什么计划/.test(text)) action = "query";

    // 标题：剥掉时间词
    let title = text
      .replace(/(今天|明天|后天|下周|周[日一二三四五六天]|上午|下午|傍晚|晚上|凌晨|早上|早上)?(\d{1,2})[:点](\d{1,2})?/g, "")
      .replace(/(很急|很重要|记得|有空|随便)/g, "")
      .replace(/，|。|,|\.|！|\?/g, "").trim();
    if (!title) title = "待办事项";

    const end = new Date(target.getTime() + 60 * 60 * 1000);

    return {
      action,
      title,
      start_at: toISO(target),
      end_at: toISO(end),
      priority: window.Priority.infer(text),
      category: /(工作|老板|客户|会议|报告)/.test(text) ? "work"
              : /(考试|学习|作业|论文|答辩|面试)/.test(text) ? "study"
              : /(健身|跑步|医院|药|觉)/.test(text) ? "health" : "life",
      note: "",
      target: action === "cancel" ? title : "",
    };
  }

  function toISO(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  }

  async function parse(userText) {
    if (hasReal()) {
      try { return await realParse(userText); }
      catch (e) {
        // 真接口失败，降级到 Mock
        const m = mockParse(userText);
        m._degraded = "LLM 接口失败，已降级规则解析：" + e.message;
        return m;
      }
    }
    return mockParse(userText);
  }

  return { configure, parse, hasReal };
})();
