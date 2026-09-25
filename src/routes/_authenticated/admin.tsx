import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ExternalLink, LogOut } from "lucide-react";
import { getAdminStatus, getAdminOverview, updateSubscription } from "@/lib/admin.functions";
import { getNiche, WORKSPACES, tr } from "@/lib/niches";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Admin panel — KabinetAI" },
      { name: "description", content: "Platforma foydalanuvchilari, obunalar va statistika." },
      { property: "og:title", content: "Admin panel — KabinetAI" },
      { property: "og:description", content: "Foydalanuvchilar, obunalar va statistika." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const statusCls: Record<string, string> = {
  active: "bg-success text-success-foreground",
  trial: "bg-secondary text-secondary-foreground",
  expired: "bg-destructive text-destructive-foreground",
};
const statusLabel: Record<string, string> = { active: "Faol", trial: "Sinov", expired: "Tugagan" };

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const statusFn = useServerFn(getAdminStatus);
  const overviewFn = useServerFn(getAdminOverview);
  const subFn = useServerFn(updateSubscription);
  const [filter, setFilter] = useState("");
  const [days, setDays] = useState(30);

  const status = useQuery({
    queryKey: ["admin-status"],
    queryFn: () => {
      const setupSecret = new URLSearchParams(window.location.search).get("setup") ?? undefined;
      return statusFn({ data: setupSecret ? { setupSecret } : undefined });
    },
  });
  const q = useQuery({ queryKey: ["admin"], queryFn: () => overviewFn(), enabled: !!status.data?.isAdmin });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (status.isLoading || (status.data?.isAdmin && q.isLoading))
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!status.data?.isAdmin)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">Bu hisobda admin huquqi yo'q.</p>
        <Button variant="outline" onClick={signOut}>Chiqish</Button>
      </div>
    );
  if (q.error || !q.data) return <div className="p-6 text-center text-muted-foreground">Ma'lumotni yuklab bo'lmadi.</div>;

  const { users, stats } = q.data;
  const shown = users.filter((u) => !filter || [u.first_name, u.username, String(u.telegram_id), u.niche].some((v) => v?.toLowerCase().includes(filter.toLowerCase())));
  const act = async (telegramId: number, action: "extend" | "trial" | "expire") => {
    try {
      await subFn({ data: { telegramId, action, days } });
      toast.success("Saqlandi");
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="font-display text-lg font-bold">Kabinet<span className="text-accent">AI</span> <span className="text-sm font-medium text-muted-foreground">admin</span></Link>
        <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> Chiqish</Button>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 pb-16">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            ["Jami foydalanuvchilar", stats.total],
            ["Faol obuna", stats.active],
            ["Sinovda", stats.trial],
            ["Muddati tugagan", stats.expired],
            ["Qayta ishlangan xabarlar", stats.messages],
            ["AI klasterlar", stats.clusters],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{l}</p>
              <p className="mt-1 font-display text-2xl font-bold">{v}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Faol sohalar reytingi</h2>
          {stats.niches.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Hozircha ma'lumot yo'q</p> : (
            <div className="mt-4 space-y-2">
              {stats.niches.map(([id, n]) => {
                const ni = getNiche(id);
                return (
                  <div key={id} className="flex items-center gap-3 text-sm">
                    <span className="w-56 truncate">{ni.emoji} {tr(ni.name, "uz")}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${(n / stats.total) * 100}%` }} /></div>
                    <b className="w-8 text-right">{n}</b>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">Foydalanuvchilar</h2>
            <div className="flex items-center gap-2">
              <Input placeholder="Qidirish..." value={filter} onChange={(e) => setFilter(e.target.value)} className="w-56" />
              <label className="flex items-center gap-1 text-sm text-muted-foreground">
                <Input type="number" min={1} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 30))} className="w-20" /> kun
              </label>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  {["Foydalanuvchi", "Telegram ID", "Soha", "Til", "Joy / chatlar", "Ulangan", "Obuna", "Amallar"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => {
                  const ni = u.niche ? getNiche(u.niche) : null;
                  return (
                    <tr key={u.telegram_id} className="border-b border-border align-top">
                      <td className="px-2 py-3"><b>{u.first_name ?? "—"}</b><div className="text-xs text-muted-foreground">{u.username ? "@" + u.username : ""}</div></td>
                      <td className="px-2 py-3 font-mono text-xs">{u.telegram_id}</td>
                      <td className="px-2 py-3">{ni ? `${ni.emoji} ${tr(ni.name, "uz")}` : <span className="text-muted-foreground">sozlanmoqda</span>}</td>
                      <td className="px-2 py-3 uppercase">{u.language}</td>
                      <td className="px-2 py-3 text-xs">{tr(WORKSPACES.find((w) => w.id === u.workspace_type)?.label, "uz") || "—"}<div className="text-muted-foreground">{u.chats.join(", ")}</div></td>
                      <td className="px-2 py-3 text-xs">{new Date(u.created_at).toLocaleDateString("ru-RU")}</td>
                      <td className="px-2 py-3">
                        <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", statusCls[u.status] ?? statusCls['trial'])}>{statusLabel[u.status] ?? u.status}</span>
                        {u.ends_at && <div className="mt-1 text-xs text-muted-foreground">{new Date(u.ends_at).toLocaleDateString("ru-RU")} gacha</div>}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" onClick={() => act(u.telegram_id, "extend")}>+{days} kun</Button>
                          <Button size="sm" variant="outline" onClick={() => act(u.telegram_id, "trial")}>Sinov</Button>
                          <Button size="sm" variant="outline" onClick={() => act(u.telegram_id, "expire")}>O'chirish</Button>
                          <a href={`/cabinet/${u.cabinet_token}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:underline">Kabinet <ExternalLink className="h-3 w-3" /></a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && <tr><td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">Foydalanuvchilar yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
