import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

const TIMEOUT_MS = 12 * 3600 * 1000;
type Rpc = { id?: number | string; method?: string; params?: Record<string, any> };

/** Payme Merchant API (JSON-RPC). One endpoint per owner: /api/public/pay/payme/<ownerTelegramId>. */
export const Route = createFileRoute("/api/public/pay/payme/$owner")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (params.owner === "platform") {
          const { handlePlatformPayme } = await import("@/lib/platform.server");
          return handlePlatformPayme(request);
        }
        let body: Rpc = {};
        let parsed = true;
        try { body = await request.json(); } catch { parsed = false; }
        const id = body.id ?? null;
        const ok = (result: unknown) => Response.json({ id, result });
        const err = (code: number, msg: string, data?: string) =>
          Response.json({ id, error: { code, message: { uz: msg, ru: msg, en: msg }, data } });
        if (!parsed) return err(-32700, "Parse error");

        const ownerId = Number(params.owner);
        if (!Number.isFinite(ownerId)) return err(-32504, "Unauthorized");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: vipKey } = await supabaseAdmin.from("vip_settings").select("payme_key").eq("owner_id", ownerId).maybeSingle();
        const { data: bookKey } = await supabaseAdmin.from("booking_settings").select("payme_key").eq("owner_id", ownerId).maybeSingle();
        const auth = request.headers.get("authorization") ?? "";
        const keys = [vipKey?.payme_key, bookKey?.payme_key].filter((k): k is string => !!k);
        const authed = keys.some((k) => {
          const expected = `Basic ${Buffer.from(`Paycom:${k}`).toString("base64")}`;
          const a = Buffer.from(auth), b = Buffer.from(expected);
          return a.length === b.length && timingSafeEqual(a, b);
        });
        if (!authed) return err(-32504, "Unauthorized");

        const p: any = body.params ?? {};
        type PayPatch = {
          provider?: string; provider_tx?: string; status?: string;
          payme_state?: number; payme_reason?: number | null; payme_cancel_time?: number; payme_create_time?: number; payme_perform_time?: number;
        };
        const loadOrder = async (orderId: unknown) => {
          if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId)) return null;
          const { data: vip } = await supabaseAdmin.from("vip_orders").select("*").eq("id", orderId).eq("owner_id", ownerId).maybeSingle();
          if (vip) return { ...vip, _table: "vip_orders" as const };
          const { data: dep } = await supabaseAdmin.from("booking_deposits").select("*").eq("id", orderId).eq("owner_id", ownerId).maybeSingle();
          return dep ? { ...dep, _table: "booking_deposits" as const } : null;
        };
        const byTx = async (tx: unknown) => {
          const { data: vip } = await supabaseAdmin.from("vip_orders").select("*").eq("owner_id", ownerId).eq("provider", "payme").eq("provider_tx", String(tx)).maybeSingle();
          if (vip) return { ...vip, _table: "vip_orders" as const };
          const { data: dep } = await supabaseAdmin.from("booking_deposits").select("*").eq("owner_id", ownerId).eq("provider", "payme").eq("provider_tx", String(tx)).maybeSingle();
          return dep ? { ...dep, _table: "booking_deposits" as const } : null;
        };
        const save = (o: { id: string; _table: "vip_orders" | "booking_deposits" }, values: PayPatch) =>
          o._table === "booking_deposits"
            ? supabaseAdmin.from("booking_deposits").update(values).eq("id", o.id)
            : supabaseAdmin.from("vip_orders").update(values).eq("id", o.id);
        const txView = (o: any) => ({
          create_time: Number(o.payme_create_time ?? 0), perform_time: Number(o.payme_perform_time ?? 0), cancel_time: Number(o.payme_cancel_time ?? 0),
          transaction: o.id, state: o.payme_state ?? 1, reason: o.payme_reason ?? null,
        });

        switch (body.method) {
          case "CheckPerformTransaction": {
            const o = await loadOrder(p.account?.order_id);
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
                await save(existing, { payme_state: -1, payme_reason: 4, payme_cancel_time: Date.now(), status: "cancelled" }).eq("payme_state", 1);
                return err(-31008, "Timeout");
              }
              return ok({ create_time: Number(existing.payme_create_time), transaction: existing.id, state: 1 });
            }
            const o = await loadOrder(p.account?.order_id);
            if (!o) return err(-31050, "Order not found", "order_id");
            if (Math.round(Number(o.amount) * 100) !== Number(p.amount)) return err(-31001, "Wrong amount");
            if (o.status !== "pending" || o.payme_state) return err(-31050, "Order busy", "order_id");
            const t = Number(p.time) || Date.now();
            const { data: created } = await save(o, { provider: "payme", provider_tx: String(p.id), payme_state: 1, payme_create_time: t }).is("payme_state", null).select("id");
            if (!created?.length) return err(-31050, "Order busy", "order_id");
            return ok({ create_time: t, transaction: o.id, state: 1 });
          }
          case "PerformTransaction": {
            const o = await byTx(p.id);
            if (!o) return err(-31003, "Transaction not found");
            if (o.payme_state === 2) return ok({ transaction: o.id, perform_time: Number(o.payme_perform_time), state: 2 });
            if (o.payme_state !== 1) return err(-31008, "Cannot perform");
            if (Date.now() - Number(o.payme_create_time) > TIMEOUT_MS) {
              await save(o, { payme_state: -1, payme_reason: 4, payme_cancel_time: Date.now(), status: "cancelled" }).eq("payme_state", 1);
              return err(-31008, "Timeout");
            }
            const t = Date.now();
            const { data: moved } = await save(o, { payme_state: 2, payme_perform_time: t }).eq("payme_state", 1).select("payme_perform_time");
            if (!moved?.length) {
              const again = await byTx(p.id);
              return again?.payme_state === 2 ? ok({ transaction: again.id, perform_time: Number(again.payme_perform_time), state: 2 }) : err(-31008, "Cannot perform");
            }
            if (o._table === "booking_deposits") {
              const { fulfillBookingDeposit } = await import("@/lib/booking.server");
              await fulfillBookingDeposit(o.id, "payme", String(p.id));
            } else {
              const { fulfillVipOrder } = await import("@/lib/automation.server");
              await fulfillVipOrder(o.id, "payme", String(p.id));
            }
            return ok({ transaction: o.id, perform_time: t, state: 2 });
          }
          case "CancelTransaction": {
            const o = await byTx(p.id);
            if (!o) return err(-31003, "Transaction not found");
            if (o.payme_state === -1 || o.payme_state === -2) return ok({ transaction: o.id, cancel_time: Number(o.payme_cancel_time), state: o.payme_state });
            // Access already granted is not revoked automatically; owner sees the cancel in the cabinet.
            const state = o.payme_state === 2 ? -2 : -1;
            const t = Date.now();
            await save(o, { payme_state: state, payme_cancel_time: t, payme_reason: Number(p.reason) || null, status: "cancelled" });
            if (o._table === "booking_deposits" && state === -1) {
              const { abortUnpaidDeposit } = await import("@/lib/booking.server");
              await abortUnpaidDeposit(o.record_id);
            }
            return ok({ transaction: o.id, cancel_time: t, state });
          }
          case "CheckTransaction": {
            const o = await byTx(p.id);
            if (!o) return err(-31003, "Transaction not found");
            return ok(txView(o));
          }
          case "GetStatement": {
            const fromT = Number(p.from) || 0;
            const toT = Number(p.to) || Date.now();
            const [{ data: vipRows }, { data: depRows }] = await Promise.all([
              supabaseAdmin.from("vip_orders").select("*").eq("owner_id", ownerId).eq("provider", "payme").gte("payme_create_time", fromT).lte("payme_create_time", toT),
              supabaseAdmin.from("booking_deposits").select("*").eq("owner_id", ownerId).eq("provider", "payme").gte("payme_create_time", fromT).lte("payme_create_time", toT),
            ]);
            const rows = [...(vipRows ?? []), ...(depRows ?? [])];
            return ok({ transactions: rows.map((o) => ({ id: o.provider_tx, time: Number(o.payme_create_time), amount: Math.round(Number(o.amount) * 100), account: { order_id: o.id }, ...txView(o) })) });
          }
          default:
            return err(-32601, "Method not found");
        }
      },
    },
  },
});
