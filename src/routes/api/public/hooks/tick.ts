import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Hourly Cloud Job: due reminders (including 24h/2h appointment reminders), VIP expiry, AI content engine.
 *  Enable in Lovable (or cron-job.org) as POST /api/public/hooks/tick with Bearer LOVABLE_CRON_SECRET. */
export const Route = createFileRoute("/api/public/hooks/tick")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { runDueReminders, processVipExpiry } = await import("@/lib/automation.server");
        const reminders = await runDueReminders().catch((e) => { console.error("reminders failed", e); return -1; });
        const { releaseUnpaidDeposits } = await import("@/lib/booking.server");
        const deposits = await releaseUnpaidDeposits().catch((e) => { console.error("deposit release failed", e); return -1; });
        const vip = await processVipExpiry().catch((e) => { console.error("vip expiry failed", e); return null; });
        const { runContentEngine } = await import("@/lib/content.server");
        const content = await runContentEngine().catch((e) => { console.error("content engine failed", e); return null; });
        return Response.json({ ok: true, reminders, deposits, vip, content });
      },
    },
  },
});
