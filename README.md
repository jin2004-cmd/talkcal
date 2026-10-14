# TalkCal 🗓️💬

**说一句，排好你的日程。**

一个带 **LLM 输出质量门（Eval Gate）** 的自然语言日历 PWA：对它说"后天下午 3 点交论文，很急"，它自动拆成带时间、优先级、颜色的日历事项，手机电脑实时同步，到点系统级提醒；取消一处，处处取消。

> 纯前端零构建 · BYO LLM Key · 可选 Supabase 云同步 · MIT

---

## 这是什么

大多数「AI 日历」只是把大模型 API 套个壳——模型吐什么就显示什么，时间写错、事项撞车、优先级乱标，没人管。

TalkCal 的不同：**每一次 LLM 解析都要过一道质量门**，不合格自动打回重试，全程留痕。

```
你说："后天下午3点交论文，很急"
  ↓
LLM 解析 → { title, start_at, end_at, priority, category }
  ↓
L1 规则校验：时间合法？时长 5min-8h？和现有事项冲突？
  ↓
L2 质量打分：可执行性 / 优先级合理性（阈值 7/10）
  ↓
不达标 → 自动重试（最多 2 次），取历史最佳兜底
  ↓
气泡回你："已安排 ✅ 周四 15:00–16:00 毕业论文 🔴高优先级（从「很急」识别）"
  ↓
写入 Supabase → 其他设备 Realtime 秒级出现 → 到点 Web Push 提醒
```

## 核心亮点

- 🗣️ **对话即输入**：底部对话坞，支持"加事项 / 取消明天下午的会 / 这周还有啥没排"。
- 🎨 **语气→优先级自动配色**：很急/答辩/面试/航班 → 🔴；记得/安排/约 → 🟡；有空/随便 → 🟢。月视图每天显示对应颜色的圆点。
- 🚫 **冲突检测**：和已有事项时间撞车时，质量门直接拦下，问你要不要调整。
- 🔔 **跨设备同步 + 取消即同步**：Supabase Realtime，删一处，其他设备和未来推送一起消失。
- 📱 **PWA**：手机加到主屏幕，Web Push 关屏也能响（需要自己部署 Supabase + VAPID）。
- 🧪 **Mock 模式**：不填 LLM Key、不连 Supabase，本地也能完整玩一遍。

## 快速开始

### 在线体验（待部署后填）

> https://jin2004-cmd.github.io/talkcal/

### 本地运行

```bash
git clone https://github.com/jin2004-cmd/talkcal.git
cd talkcal
python -m http.server 8000
# 打开 http://localhost:8000
```

无需构建，原生 HTML/CSS/JS。Mock 模式免 Key 全流程可玩；要真实 AI 效果，在「设置 → LLM 接口」填 DeepSeek API Key。

### 开启云同步 + Push（可选）

见 [SETUP_SUPABASE.md](./SETUP_SUPABASE.md)：跑一段 SQL、部署一个 Edge Function、生成 VAPID 密钥，10 分钟搞定。

## 技术栈

- **前端**：原生 HTML/CSS/JS，零构建零依赖，PWA（manifest + service worker）
- **LLM**：OpenAI 兼容协议（默认 DeepSeek `deepseek-chat`，可换任意兼容服务）
- **后端（可选）**：Supabase（Postgres + Auth + Realtime + Edge Function + Web Push）
- **Eval 门**：L1 确定性规则 + L2 LLM-as-Judge，阈值与重试次数可配置

## 项目结构

```
talkcal/
├── index.html
├── manifest.json
├── sw.js
├── icon.svg
├── css/style.css
├── js/
│   ├── app.js        # Tab 路由 + 设置
│   ├── calendar.js    # 月视图 + 日抽屉
│   ├── chat.js       # 对话坞
│   ├── llm.js        # OpenAI 兼容客户端 + Mock 解析
│   ├── eval.js       # ⭐ 质量门（L1 + L2 + 重试 + 日志）
│   ├── priority.js   # 语气词表 → high/med/low
│   ├── store.js      # localStorage + Supabase Realtime
│   └── push.js       # VAPID 订阅
├── supabase/
│   ├── migrations/0001_init.sql
│   └── functions/send-reminders/index.ts
├── docs/
└── README.md
```

## Roadmap

- [ ] 周视图拖拽排程
- [ ] 重复事件（"每周三健身"）
- [ ] 晚间复盘 + 周报（从 DayPilot 移植）
- [ ] 语音输入（Web Speech API）
- [ ] .ics 导出到系统日历
- [ ] 主题皮肤 / 动效打磨
- [ ] Eval 校验维度可配置

## 参与贡献

欢迎 Issue 和 PR，特别是：
- 优先级词表（什么中文表达算"急"？）
- L1 校验规则（还有哪些"不合理的日程"该被拦下？）
- README 翻译

## License

MIT © 2026 jin2004-cmd

---

## English

**TalkCal** is a natural-language calendar PWA with a built-in **LLM output evaluation gate**: every parsed event must pass deterministic rule checks + an LLM-as-Judge score (threshold 7/10, auto-retry up to 2 times) before it lands on your calendar. Say "deadline Thursday 3pm, urgent" and it color-codes the event, syncs across devices via Supabase Realtime, fires a Web Push reminder, and propagates cancellations to every device. No build step, bring your own DeepSeek key, optional cloud sync.

Live demo: https://jin2004-cmd.github.io/talkcal/
