# TalkCal V2.3 更新留痕

按用户反馈：底部对话坞挡住日历，改成可拖动悬浮机器人；概览加已完成历史；Light 皮肤调淡雅；机器人可换名换头像。

## 改动清单

- [V2.3-01] 常驻底部对话坞 → 可拖动悬浮 FAB
  - 右下角机器人头像按钮，按住可拖到任意位置，位置持久化到 localStorage
  - 点击升起半屏聊天面板（带遮罩），点遮罩/✕/Esc 关闭
  - FAB 只在日历 tab 显示，打开面板时 FAB 自动隐藏
  - 拖拽超过 6px 视为拖动，不会误触打开面板

- [V2.3-02] 概览 tab 升级为两段
  - 上半：即将到来（未来 7 天），按优先级（high→med→low）再按时间排序
  - 每个即将到来的事项多了一个 ✓ 按钮，点一下标记完成并放彩炮
  - 下半：已完成·回顾，倒序最多 30 条，像日记

- [V2.3-03] 个性化助手设置
  - 设置里新增"🤖 个性化助手"分组
  - 机器人名字可改（默认"小谈"，最多 12 字）
  - 4 个原创 SVG 机器人头像可选：豆豆（紫圆头）/方方（蓝方头）/探探（绿天线）/听听（粉耳机）
  - 选完立即应用到 FAB 和聊天面板头部

- [V2.3-04] Light 皮肤调淡雅
  - 背景 #f8fafc → #fafaf9（暖灰白）
  - 边框 #e2e8f0 → #eef0f3（更细更淡）
  - 主色 #0f172a（纯黑）→ #475569（柔和深灰蓝）
  - 文字 #0f172a → #1f2937
  - 圆角 14px → 16px，更圆润

## 新文件
- `js/bots.js`：4 个原创机器人 SVG 头像库

## 改的文件
- `index.html`：拆 chatDock 为 FAB + overlay + panel；概览加 doneList；设置加个性化分组
- `css/style.css`：删旧 chat-dock，加 FAB/panel/overlay/avatar-picker/done-list 样式；light 皮肤调色
- `js/chat.js`：FAB 开关、拖拽、open/close 暴露、Esc 关面板
- `js/app.js`：renderUpcoming 双段、✓完成按钮、loadSettings/saveSettings 加 bot name+avatar、renderAvatarPicker
- `sw.js`：cache bump v2.3，precache 加 bots.js
