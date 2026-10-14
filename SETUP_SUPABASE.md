# 开启 Supabase 云同步 + Web Push

10 分钟把 TalkCal 从"本地玩具"升到"手机电脑同步 + 到点提醒"。

## 1. 建 Supabase 项目

1. 去 https://supabase.com 新建项目（免费额度够个人用）。
2. 记下 `Project URL` 和 `anon public key`（Settings → API）。
3. 在 SQL Editor 里整段执行 [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql)。

## 2. 配 VAPID 密钥

本地跑：

```bash
npx web-push generate-vapid-keys
```

得到 public / private 两个字符串，在 Supabase → Project Settings → Edge Functions → Secrets 里加：

- `VAPID_PUBLIC`
- `VAPID_PRIVATE`
- `VAPID_SUBJECT`（填 `mailto:you@example.com`）

## 3. 部署 Edge Function

```bash
supabase functions deploy send-reminders --no-verify-jwt
```

然后在 SQL Editor 里配 cron（每分钟触发一次）：

```sql
select cron.schedule(
  'send-reminders',
  '* * * * *',
  $$select net.http_post(
    url:='https://<your-project-ref>.functions.supabase.co/send-reminders',
    headers:='{"Authorization":"Bearer <your-anon-key>"}'::jsonb
  );$$
);
```

## 4. 在 App 里填入

打开 TalkCal → 设置中心：

- LLM 接口：填 DeepSeek Base URL / Key / 模型名
- Supabase：填 Project URL / anon key → 点"连接 / 登录"（邮箱 magic link）
- VAPID public key 填到 localStorage：浏览器 Console 里跑一次
  ```js
  localStorage.setItem("talkcal.vapid.public", "<你的 VAPID public>"); location.reload();
  ```
- 点对话坞旁的任意事项 → 浏览器会弹"允许通知"。

完成：手机和电脑登录同账号，加/删事件秒级同步，事件前 10 分钟手机会弹通知。
