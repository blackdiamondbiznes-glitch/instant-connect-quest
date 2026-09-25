import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Hourly job: due reminders + VIP expiry warnings/removals. */
export const Route = createFileRoute("/api/public/hooks/tick")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { runDueReminders, processVipExpiry } = await import("@/lib/automation.server");
        const reminders = await runDueReminders().catch((e) => { console.error("reminders failed", e); return -1; });
        const vip = await processVipExpiry().catch((e) => { console.error("vip expiry failed", e); return null; });
        return Response.json({ ok: true, reminders, vip });
      },
    },
  },
});
