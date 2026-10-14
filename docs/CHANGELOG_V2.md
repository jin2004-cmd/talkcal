# TalkCal V2 动效与交互变更日志

> 每条改动一个编号，方便你回滚——想删哪个效果，直接按编号在对应文件里搜 `[V2-XX]`。
> 原则：所有动效只用 `transform` / `opacity`（GPU 合成层），不触发 layout；`prefers-reduced-motion` 一律降级为直接切换。

## 皮肤系统

- [V2-01] 引入三套皮肤：`light`（白昼，默认）/ `dark`（暗夜）/ `aurora`（极光，紫青渐变）
- [V2-02] 设置页新增换肤选择器，选择写入 `localStorage("talkcal.skin")`，启动时恢复
- [V2-03] 极光皮肤用 CSS 渐变背景 + 玻璃拟态卡片，不堆装饰元素

## 动效基础设施（js/anim.js）

- [V2-04] `Anim.press(el)`：所有可点元素按下时 scale(0.96)，抬起回弹
- [V2-05] `Anim.fadeIn(el, {stagger})`：列表项 stagger 入场，每条约 40ms 间隔
- [V2-06] `Anim.rollNumber(el, to)`：统计数字从旧值滚动到新值
- [V2-07] `Anim.shake(el)`：错误/取消时水平抖动
- [V2-08] `Anim.destroy(el)`：取消事项时条目碎裂消散（scale + opacity + 模糊）
- [V2-09] `Anim.isReduced()`：读 `prefers-reduced-motion`，所有动效自动短路
- [V2-10] 所有动画统一用 `cubic-bezier(0.22, 1, 0.36, 1)`（spring-out），时长 200-350ms

## 彩炮（js/confetti.js）

- [V2-11] 完成事项时在屏幕中央喷 ~80 粒彩纸，3 秒内重力下落淡出，零依赖 canvas 实现
- [V2-12] 彩纸颜色取当前皮肤主色 + 优先级色，不硬编码

## 日历页

- [V2-13] 月份切换：左右月视图横向滑入（根据上/下方向）
- [V2-14] 日期格子点按缩放反馈
- [V2-15] 新增事项时对应日期的圆点 pop-in（scale 0→1.2→1）
- [V2-16] 选中日期外圈扩散环动画
- [V2-17] 今日高亮呼吸微光

## 事项列表

- [V2-18] 完成 ✓：对勾打勾动画 + 彩炮 + 条目收缩消失（max-height + opacity）
- [V2-19] 取消 ✕：shake 抖动 + destroy 碎裂消散
- [V2-20] 条目入场 stagger（40ms 间隔）

## 对话坞

- [V2-21] 用户气泡从右滑入，AI 气泡从左滑入
- [V2-22] 发送后按钮短暂 loading，输入框 disable
- [V2-23] 解析中显示"正在安排..."打字机省略号

## 骨架屏与加载

- [V2-24] 首屏日历渲染前显示 shimmer 骨架格
- [V2-25] 切换 Tab 时旧视图 fade-out、新视图 fade-in，不白屏

## 微交互

- [V2-26] 底部 Tab 切换时指示器横向滑动
- [V2-27] 按钮 hover 抬升、press 下沉
- [V2-28] 手机端完成/取消触发 `navigator.vibrate(10)` 震动反馈

## 工程约束

- [V2-29] 所有动效结束后自动 `will-change: auto`，避免常驻合成层吃内存
- [V2-30] 滚动列表加 `content-visibility: auto`，长列表不卡
- [V2-31] 对话日志只保留最近 50 条，防止长时间使用内存增长

## 已修复的 Bug（V2 实测发现）

- [V2-FIX1] `addBubble` 原本不返回元素，导致 `typing.remove()` 抛 TypeError，发送后整个流程卡死。已改为 return 创建的气泡节点。
- [V2-FIX2] V1 遗留：`toISOString()` 转 UTC 导致东八区"今天"高亮偏到前一天。已改本地日期格式化。

## V2.1 小补丁

- [V2-32] 日历日期格子鼠标悬停：背景光晕 + scale(1.08) + 阴影；事项列表行悬停右移 2px + 阴影；月份切换按钮悬停高亮
- [V2-33] "外观与皮肤"设置组默认展开，不再被折叠挡住

