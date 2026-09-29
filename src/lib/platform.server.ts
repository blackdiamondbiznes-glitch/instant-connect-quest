import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLAN_PERIOD_DAYS, PLAN_PRICE_UZS } from "./config";
import { tr, type L } from "./niches";

const TIMEOUT_MS = 12 * 3600 * 1000;

const T = {
  paid: {
    uz: "✅ Obuna faollashdi: {tier}, {date} gacha. Shu akkauntdagi barcha salonlar shu tarifda.",
    ru: "✅ Подписка активна: {tier}, до {date}. Все салоны этого аккаунта на этом тарифе.",
    en: "✅ Subscription is active: {tier}, until {date}. Every salon on this account uses this plan.",
  },
} satisfies Record<string, L>;

export function platformMerchants() {
  const clickService = process.env["PLATFORM_CLICK_SERVICE_ID"] || null;
  const clickMerchant = process.env["PLATFORM_CLICK_MERCHANT_ID"] || null;
  const clickSecret = process.env["PLATFORM_CLICK_SECRET"] || null;
  const paymeId = process.env["PLATFORM_PAYME_ID"] || null;
  const paymeKey = process.env["PLATFORM_PAYME_KEY"] || null;
  return { clickService, clickMerchant, clickSecret, paymeId, paymeKey };
}

export async function createPlatformOrder(ownerId: number, tier: "start" | "pro") {
  const m = platformMerchants();
  const ready = (!!m.clickService && !!m.clickMerchant) || !!m.paymeId;
  if (!ready) return { ok: false as const, error: "not_configured" as const };
  const { data, error } = await supabaseAdmin.from("platform_orders").insert({
    owner_id: ownerId, tier, days: PLAN_PERIOD_DAYS, amount: PLAN_PRICE_UZS[tier],
  }).select("id,amount").single();
  if (error || !data) throw new Error(error?.message ?? "order");
  const { paymentLinks } = await import("./automation.server");
  return {
    ok: true as const,
    links: paymentLinks(
      { id: data.id, amount: Number(data.amount) },
      { click_service_id: m.clickService, click_merchant_id: m.clickMerchant, payme_merchant_id: m.paymeId },
    ),
  };
}

/** Marks the order paid and extends every salon on that Telegram account. */
export async function fulfillPlatformOrder(orderId: string, provider: string, providerTx: string | null) {
  const { data: o } = await supabaseAdmin.from("platform_orders").select("*").eq("id", orderId).maybeSingle();
  if (!o) return false;
  if (o.status === "paid") return true;
  const paidAt = new Date().toISOString();
  const { data: upd } = await supabaseAdmin.from("platform_orders")
    .update({ status: "paid", provider, provider_tx: providerTx ?? o.provider_tx, paid_at: paidAt })
    .eq("id", o.id).eq("status", "pending").select("id");
  if (!upd?.length) return true;

  const { data: owner } = await supabaseAdmin.from("tg_owners")
    .select("telegram_id, account_telegram_id, language, subscription_ends_at, plan_status")
    .eq("telegram_id", o.owner_id).maybeSingle();
  if (!owner) return true;
  const now = new Date();
  const base = owner.plan_status === "active" && owner.subscription_ends_at && new Date(owner.subscription_ends_at) > now
    ? new Date(owner.subscription_ends_at) : now;
  const ends = new Date(base.getTime() + o.days * 86400000).toISOString();
  const account = owner.account_telegram_id && owner.account_telegram_id > 0 ? owner.account_telegram_id : owner.telegram_id;
  await supabaseAdmin.from("tg_owners")
    .update({ plan_tier: o.tier, plan_status: "active", subscription_ends_at: ends, updated_at: paidAt })
    .eq("is_demo", false)
    .or(`telegram_id.eq.${account},account_telegram_id.eq.${account}`);
  const { notifyOwner } = await import("./automation.server");
  const text = tr(T.paid, owner.language).replace("{tier}", o.tier).replace("{date}", ends.slice(0, 10));
  await notifyOwner(Number(o.owner_id), text);
  return true;
}

type Rpc = { id?: number | string; method?: string; params?: Record<string, any> };

/** Payme JSON-RPC for KabinetAI's own merchant. URL: /api/public/pay/payme/platform */
export async function handlePlatformPayme(request: Request): Promise<Response> {
  let body: Rpc = {};
  let parsed = true;
  try { body = await request.json(); } catch { parsed = false; }
  const id = body.id ?? null;
  const ok = (result: unknown) => Response.json({ id, result });
  const err = (code: number, msg: string, data?: string) =>
    Response.json({ id, error: { code, message: { uz: msg, ru: msg, en: msg }, data } });
  if (!parsed) return err(-32700, "Parse error");

  const key = platformMerchants().paymeKey ?? "";
  const auth = request.headers.get("authorization") ?? "";
  const expected = key ? `Basic ${Buffer.from(`Paycom:${key}`).toString("base64")}` : "";
  const a = Buffer.from(auth), b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) return err(-32504, "Unauthorized");

  const p: any = body.params ?? {};
  const load = async (orderId: unknown) => {
    if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId)) return null;
    const { data } = await supabaseAdmin.from("platform_orders").select("*").eq("id", orderId).maybeSingle();
    return data;
  };
  const byTx = async (tx: unknown) => {
    const { data } = await supabaseAdmin.from("platform_orders").select("*").eq("provider", "payme").eq("provider_tx", String(tx)).maybeSingle();
    return data;
  };
  const view = (o: any) => ({
    create_time: Number(o.payme_create_time ?? 0), perform_time: Number(o.payme_perform_time ?? 0), cancel_time: Number(o.payme_cancel_time ?? 0),
    transaction: o.id, state: o.payme_state ?? 1, reason: o.payme_reason ?? null,
  });

  switch (body.method) {
    case "CheckPerformTransaction": {
      const o = await load(p.account?.order_id);
      if (!o) return err(-31050, "Order not found", "order_id");
      if (Math.round(Number(o.amount) * 100) !== Number(p.amount)) return err(-31001, "Wrong amount");
      if (o.status !== "pending" || o.payme_state) return err(-31050, "Order unavailable", "order_id");
      return ok({ allow: true });
    }
    case "CreateTransaction": {
      const existing = await byTx(p.id);
      if (existing) {
        if (existing.payme_state !== 1) return err(-31008, "Cannot perform");
        if (Date.now() - Number(existing.payme_create_time) > TIMEOUT_MS) {
          await supabaseAdmin.from("platform_orders").update({ payme_state: -1, payme_reason: 4, payme_cancel_time: Date.now(), status: "cancelled" }).eq("id", existing.id).eq("payme_state", 1);
          return err(-31008, "Timeout");
        }
        return ok({ create_time: Number(existing.payme_create_time), transaction: existing.id, state: 1 });
      }
      const o = await load(p.account?.order_id);
      if (!o) return err(-31050, "Order not found", "order_id");
      if (Math.round(Number(o.amount) * 100) !== Number(p.amount)) return err(-31001, "Wrong amount");
      if (o.status !== "pending" || o.payme_state) return err(-31050, "Order busy", "order_id");
      const t = Number(p.time) || Date.now();
      const { data: created } = await supabaseAdmin.from("platform_orders").update({ provider: "payme", provider_tx: String(p.id), payme_state: 1, payme_create_time: t }).eq("id", o.id).is("payme_state", null).select("id");
      if (!created?.length) return err(-31050, "Order busy", "order_id");
      return ok({ create_time: t, transaction: o.id, state: 1 });
    }
    case "PerformTransaction": {
      const o = await byTx(p.id);
      if (!o) return err(-31003, "Transaction not found");
      if (o.payme_state === 2) return ok({ transaction: o.id, perform_time: Number(o.payme_perform_time), state: 2 });
      if (o.payme_state !== 1) return err(-31008, "Cannot perform");
      if (Date.now() - Number(o.payme_create_time) > TIMEOUT_MS) {
        await supabaseAdmin.from("platform_orders").update({ payme_state: -1, payme_reason: 4, payme_cancel_time: Date.now(), status: "cancelled" }).eq("id", o.id).eq("payme_state", 1);
        return err(-31008, "Timeout");
      }
      const t = Date.now();
      const { data: moved } = await supabaseAdmin.from("platform_orders").update({ payme_state: 2, payme_perform_time: t }).eq("id", o.id).eq("payme_state", 1).select("payme_perform_time");
      if (!moved?.length) {
        const again = await byTx(p.id);
        return again?.payme_state === 2 ? ok({ transaction: again.id, perform_time: Number(again.payme_perform_time), state: 2 }) : err(-31008, "Cannot perform");
      }
      await fulfillPlatformOrder(o.id, "payme", String(p.id));
      return ok({ transaction: o.id, perform_time: t, state: 2 });
    }
    case "CancelTransaction": {
      const o = await byTx(p.id);
      if (!o) return err(-31003, "Transaction not found");
      if (o.payme_state === -1 || o.payme_state === -2) return ok({ transaction: o.id, cancel_time: Number(o.payme_cancel_time), state: o.payme_state });
      const state = o.payme_state === 2 ? -2 : -1;
      const t = Date.now();
      await supabaseAdmin.from("platform_orders").update({ payme_state: state, payme_cancel_time: t, payme_reason: Number(p.reason) || null, status: "cancelled" }).eq("id", o.id);
      return ok({ transaction: o.id, cancel_time: t, state });
    }
    case "CheckTransaction": {
      const o = await byTx(p.id);
      if (!o) return err(-31003, "Transaction not found");
      return ok(view(o));
    }
    case "GetStatement": {
      const { data } = await supabaseAdmin.from("platform_orders").select("*").eq("provider", "payme")
        .gte("payme_create_time", Number(p.from) || 0).lte("payme_create_time", Number(p.to) || Date.now());
      return ok({ transactions: (data ?? []).map((o) => ({ id: o.provider_tx, time: Number(o.payme_create_time), amount: Math.round(Number(o.amount) * 100), account: { order_id: o.id }, ...view(o) })) });
    }
    default:
      return err(-32601, "Method not found");
  }
}
