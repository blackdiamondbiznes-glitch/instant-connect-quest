import { createServerFn } from "@tanstack/react-start";

export const getDemoCabinets = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("tg_owners").select("niche, cabinet_token").eq("is_demo", true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ niche: r.niche as string, token: r.cabinet_token as string }));
});
