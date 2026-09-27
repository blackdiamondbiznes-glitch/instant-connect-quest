import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Tok = z.object({ token: z.string().uuid(), initData: z.string().max(4096).optional().nullable() });
const ChatId = z.union([z.number(), z.string().regex(/^-?\d+$/)]).transform(Number);

async function contentOwner(token: string, initData?: string | null) {
  const { mutationOwner } = await import("./cabinet.server");
  const r = await mutationOwner(token, initData);
  if (r.error) return { owner: null, error: r.error };
  if (!(r.owner.modules as string[]).includes("ai_content")) return { owner: null, error: "module_disabled" as const };
  return { owner: r.owner, error: null };
}

export const suggestNow = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.parse(d))
  .handler(async ({ data }) => {
    const r = await contentOwner(data.token, data.initData);
    if (!r.owner) return { ok: false as const, error: r.error };
    const { suggest } = await import("./content.server");
    const res = await suggest(r.owner, "post", { respectSpacing: false });
    return res.ok ? { ok: true as const, error: null } : { ok: false as const, error: res.error === "quota" ? "content_quota" : res.error };
  });

export const publishSuggestion = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.extend({ id: z.string().uuid(), chat_id: ChatId.nullable().optional(), text: z.string().trim().min(1).max(4000).optional() }).parse(d))
  .handler(async ({ data }) => {
    const r = await contentOwner(data.token, data.initData);
    if (!r.owner) return { ok: false as const, error: r.error };
    const { publish } = await import("./content.server");
    const res = await publish(r.owner, data.id, data.chat_id ?? null, data.text);
    return res.ok ? { ok: true as const, error: null } : { ok: false as const, error: res.error };
  });

export const dismissSuggestion = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const r = await contentOwner(data.token, data.initData);
    if (!r.owner) return { ok: false as const, error: r.error };
    const { supabaseAdmin } = await import("./cabinet.server");
    const { error } = await supabaseAdmin.from("content_suggestions").update({ status: "dismissed" }).eq("id", data.id).eq("owner_id", r.owner.telegram_id).in("status", ["pending", "info"]);
    if (error) throw new Error(error.message);
    return { ok: true as const, error: null };
  });

export const saveContentSettings = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.extend({ auto_publish: z.boolean(), footer_disabled: z.boolean(), chat_id: ChatId.nullable() }).parse(d))
  .handler(async ({ data }) => {
    const r = await contentOwner(data.token, data.initData);
    if (!r.owner) return { ok: false as const, error: r.error };
    const { supabaseAdmin, effectiveTier } = await import("./cabinet.server");
    const { FOOTER_REMOVABLE_TIERS } = await import("./config");
    if (data.footer_disabled && !FOOTER_REMOVABLE_TIERS.includes(effectiveTier(r.owner))) return { ok: false as const, error: "tier_required" as const };
    if (data.chat_id !== null) {
      const { data: c } = await supabaseAdmin.from("tg_chats").select("chat_id").eq("chat_id", data.chat_id).eq("owner_id", r.owner.telegram_id).maybeSingle();
      if (!c) return { ok: false as const, error: "forbidden" as const };
    }
    const { error } = await supabaseAdmin.from("tg_owners")
      .update({ content_auto_publish: data.auto_publish, content_footer_disabled: data.footer_disabled, content_chat_id: data.chat_id, updated_at: new Date().toISOString() })
      .eq("telegram_id", r.owner.telegram_id);
    if (error) throw new Error(error.message);
    return { ok: true as const, error: null };
  });
