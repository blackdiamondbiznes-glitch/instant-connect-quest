import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

const md5 = (s: string) => createHash("md5").update(s).digest("hex");
const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

type ClickOrder = { id: string; seq: number; amount: number; status: string; owner_id: number; record_id?: string | null };

/** Click SHOP-API: action=0 (prepare) and action=1 (complete) on one URL.
 *  The same URL serves VIP orders, booking deposits, and KabinetAI plan payments. */
export const Route = createFileRoute("/api/public/pay/click")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = new URLSearchParams(await request.text());
        const p = (k: string) => form.get(k) ?? "";
        const clickTransId = p("click_trans_id"), orderId = p("merchant_trans_id"), action = p("action");
        const reply = (error: number, error_note: string, extra: Record<string, unknown> = {}) =>
          Response.json({ click_trans_id: Number(clickTransId) || 0, merchant_trans_id: orderId, error, error_note, ...extra });

        if (!/^[0-9a-f-]{36}$/i.test(orderId)) return reply(-5, "Order not found");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: vip } = await supabaseAdmin.from("vip_orders").select("*").eq("id", orderId).maybeSingle();
        const { data: dep } = vip ? { data: null } : await supabaseAdmin.from("booking_deposits").select("*").eq("id", orderId).maybeSingle();
        const { data: plan } = vip || dep ? { data: null } : await supabaseAdmin.from("platform_orders").select("*").eq("id", orderId).maybeSingle();
        const o = (vip ?? dep ?? plan) as ClickOrder | null;
        if (!o) return reply(-5, "Order not found");

        let secret: string | null = null;
        let serviceId: string | null = null;
        if (vip) {
          const { data: s } = await supabaseAdmin.from("vip_settings").select("click_service_id,click_secret_key").eq("owner_id", o.owner_id).maybeSingle();
          secret = s?.click_secret_key ?? null;
          serviceId = s?.click_service_id ?? null;
        } else if (dep) {
          const { data: s } = await supabaseAdmin.from("booking_settings").select("click_service_id,click_secret_key").eq("owner_id", o.owner_id).maybeSingle();
          secret = s?.click_secret_key ?? null;
          serviceId = s?.click_service_id ?? null;
        } else {
          const { platformMerchants } = await import("@/lib/platform.server");
          const m = platformMerchants();
          secret = m.clickSecret;
          serviceId = m.clickService;
        }
        if (!secret || serviceId !== p("service_id")) return reply(-1, "SIGN CHECK FAILED");

        const expected = md5(clickTransId + p("service_id") + secret + orderId + (action === "1" ? p("merchant_prepare_id") : "") + p("amount") + action + p("sign_time"));
        if (!safeEq(expected, p("sign_string"))) return reply(-1, "SIGN CHECK FAILED");
        if (Math.abs(Number(p("amount")) - Number(o.amount)) > 0.01) return reply(-2, "Incorrect parameter amount");
        if (o.status === "cancelled") return reply(-9, "Transaction cancelled");

        const table = vip ? "vip_orders" as const : dep ? "booking_deposits" as const : "platform_orders" as const;
        const save = (values: { provider?: string; provider_tx?: string; status?: string }) =>
          supabaseAdmin.from(table).update(values).eq("id", o.id);

        if (action === "0") {
          if (o.status === "paid") return reply(-4, "Already paid");
          await save({ provider: "click", provider_tx: clickTransId });
          return reply(0, "Success", { merchant_prepare_id: o.seq });
        }
        if (action === "1") {
          if (String(o.seq) !== p("merchant_prepare_id")) return reply(-6, "Transaction does not exist");
          if (Number(p("error")) < 0) {
            if (o.status !== "paid") await save({ status: "cancelled" });
            if (dep) {
              const { abortUnpaidDeposit } = await import("@/lib/booking.server");
              await abortUnpaidDeposit(dep.record_id);
            }
            return reply(-9, "Transaction cancelled");
          }
          if (o.status === "paid") return reply(-4, "Already paid", { merchant_confirm_id: o.seq });
          if (vip) {
            const { fulfillVipOrder } = await import("@/lib/automation.server");
            await fulfillVipOrder(o.id, "click", clickTransId);
          } else if (dep) {
            const { fulfillBookingDeposit } = await import("@/lib/booking.server");
            await fulfillBookingDeposit(o.id, "click", clickTransId);
          } else {
            const { fulfillPlatformOrder } = await import("@/lib/platform.server");
            await fulfillPlatformOrder(o.id, "click", clickTransId);
          }
          return reply(0, "Success", { merchant_confirm_id: o.seq });
        }
        return reply(-3, "Action not found");
      },
    },
  },
});
