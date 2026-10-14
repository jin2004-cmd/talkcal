// supabase/functions/send-reminders/index.ts
// 由 pg_cron 每分钟触发一次：扫描未来 lead_min 分钟内未提醒的 scheduled 事件，
// 给该用户所有设备发 Web Push。
//
// 部署：supabase functions deploy send-reminders --no-verify-jwt
// 调度：在 SQL Editor 里
//   select cron.schedule('send-reminders','* * * * *',
//     $$select net.http_post(url:='https://<project>.functions.supabase.co/send-reminders',
//       headers:='{"Authorization":"Bearer <anon-key>"}'::jsonb);$$);
// 需要 VAPID 环境变量：VAPID_PUBLIC / VAPID_PRIVATE / VAPID_SUBJECT

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") || "mailto:you@example.com",
  Deno.env.get("VAPID_PUBLIC")!,
  Deno.env.get("VAPID_PRIVATE")!
);

Deno.serve(async () => {
  const leadMin = parseInt(Deno.env.get("LEAD_MIN") || "10", 10);
  const now = new Date();
  const until = new Date(now.getTime() + leadMin * 60 * 1000);

  const { data: due } = await sb
    .from("events")
    .select("*")
    .eq("status", "scheduled")
    .is("reminded_at", null)
    .gt("start_at", now.toISOString())
    .lt("start_at", until.toISOString());

  for (const ev of due || []) {
    const { data: subs } = await sb
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", ev.user_id);

    const payload = JSON.stringify({
      title: ev.title,
      body: `${ev.start_at.slice(11,16)} 开始 · ${ev.priority === "high" ? "🔴 重要" : ""}`,
      data: { url: "/", eventId: ev.id },
    });

    for (const s of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys },
          payload
        );
      } catch (e) {
        console.error("push failed", e);
        // 410 Gone = 订阅失效，删掉
        if (e.statusCode === 410) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
    await sb.from("events").update({ reminded_at: now.toISOString() }).eq("id", ev.id);
  }

  return new Response(JSON.stringify({ scanned: (due || []).length, at: now.toISOString() }), {
    headers: { "content-type": "application/json" },
  });
});
