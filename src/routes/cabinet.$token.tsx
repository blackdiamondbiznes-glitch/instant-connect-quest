import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Brain, ClipboardList, LayoutDashboard, Loader2, Settings, Users } from "lucide-react";
import { getCabinet } from "@/lib/cabinet.functions";
import { getNiche, listSections, tr, WORKSPACES, type RecordDataType } from "@/lib/niches";
import { cn } from "@/lib/utils";
import { makeU, UI } from "@/components/cabinet/i18n";
import { tgInit } from "@/components/cabinet/shared";
import { Dashboard } from "@/components/cabinet/Dashboard";
import { ListScreen } from "@/components/cabinet/ListScreen";
import { AiScreen } from "@/components/cabinet/AiScreen";
import { SettingsScreen } from "@/components/cabinet/SettingsScreen";

export const Route = createFileRoute("/cabinet/$token")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "KabinetAI" },
      { name: "description", content: "KabinetAI — Telegram business cabinet" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Cabinet,
});

type Tab = "home" | "contacts" | "records" | "ai" | "settings";

function Cabinet() {
  const { token } = Route.useParams();
  const fetchCab = useServerFn(getCabinet);
  const q = useQuery({ queryKey: ["cab", token], queryFn: () => fetchCab({ data: { token, initData: tgInit() } }), retry: false });
  const [tab, setTab] = useState<Tab>("home");
  const [settingsStart, setSettingsStart] = useState<"main" | "services">("main");
  const [recordSection, setRecordSection] = useState<RecordDataType | undefined>();
  const [recordFilter, setRecordFilter] = useState<string | undefined>();
  const [startAdd, setStartAdd] = useState(false);

  useEffect(() => {
    const wa = (window as unknown as { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } } }).Telegram?.WebApp;
    wa?.ready?.();
    wa?.expand?.();
  }, []);

  if (q.isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (q.error || !q.data) {
    const msg = String((q.error as Error | null)?.message ?? "");
    const all = (k: "openInTelegram" | "notFound") => Object.values(UI[k]).join("\n");
    return <div className="flex min-h-screen items-center justify-center whitespace-pre-line p-6 text-center text-muted-foreground">{all(msg.includes("Unauthorized") ? "openInTelegram" : "notFound")}</div>;
  }

  const d = q.data;
  const lang = d.owner.language;
  const u = makeU(lang);
  const niche = getNiche(d.owner.niche);
  const sections = listSections(d.owner.niche, d.owner.modules, d.owner.workspace_type);
  const hasAi = ["ai_pulse", "ai_faq", "ai_content"].some((m) => d.owner.modules.includes(m));

  const tabs: { id: Tab; icon: typeof Users; label: string }[] = [
    { id: "home", icon: LayoutDashboard, label: u("home") },
    ...(sections.contacts ? [{ id: "contacts" as const, icon: Users, label: tr(sections.contacts.label, lang) }] : []),
    ...(sections.records.length ? [{ id: "records" as const, icon: ClipboardList, label: tr(sections.records[0]!.label, lang) }] : []),
    ...(hasAi ? [{ id: "ai" as const, icon: Brain, label: u("aiTab") }] : []),
    { id: "settings", icon: Settings, label: u("settings") },
  ];
  const current = tabs.some((t) => t.id === tab) ? tab : "home";
  const go = (t: Tab) => { setTab(t); window.scrollTo({ top: 0 }); };
  const title = d.owner.display_name?.trim() || `${niche.emoji} ${tr(niche.name, lang)}`;
  const endsAt = d.plan.ends_at ? new Date(d.plan.ends_at).toLocaleDateString() : null;

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-background pb-28">
      <header className="px-5 pb-4 pt-6">
        <p className="text-sm text-muted-foreground">{u("hello")}, {d.owner.first_name ?? ""} 👋</p>
        <h1 className="mt-1 truncate font-display text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {d.owner.display_name ? `${niche.emoji} ${tr(niche.name, lang)} · ` : ""}{tr(WORKSPACES.find((w) => w.id === d.owner.workspace_type)?.label, lang)}
          {!d.owner.is_demo && !d.plan.expired && endsAt ? ` · ${u(d.plan.status === "active" ? "planActive" : "planTrial")} ${lang === "uz" ? `${endsAt} ${u("planUntil")}` : `${u("planUntil")} ${endsAt}`}` : ""}
        </p>
        {d.owner.is_demo && <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">{u("demoBanner")}</p>}
        {!d.owner.is_demo && d.plan.expired && <p className="mt-3 rounded-xl bg-destructive px-3 py-2 text-xs text-destructive-foreground">{u("plan_expired")}</p>}
      </header>

      <main className="px-5">
        {current === "home" && (
          <Dashboard d={d} u={u} lang={lang} token={token} sections={sections}
            goContacts={() => go("contacts")}
            goRecords={(s, f) => { setRecordSection(s); setRecordFilter(f); setStartAdd(false); go("records"); }}
            goAi={() => go("ai")}
            goAddBooking={() => { setRecordSection("booking"); setRecordFilter("today"); setStartAdd(true); go("records"); }}
            goServices={() => { setSettingsStart("services"); go("settings"); }} />
        )}
        {current === "contacts" && <ListScreen key="contacts" kind="contacts" d={d} u={u} lang={lang} token={token} sections={sections} />}
        {current === "records" && <ListScreen key={`records:${recordSection ?? ""}:${recordFilter ?? ""}:${startAdd}`} kind="records" initialSection={recordSection} initialFilter={recordFilter} startAdd={startAdd} d={d} u={u} lang={lang} token={token} sections={sections} />}
        {current === "ai" && <AiScreen d={d} u={u} lang={lang} token={token} />}
        {current === "settings" && <SettingsScreen key={settingsStart} d={d} u={u} lang={lang} token={token} start={settingsStart} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl">
          {tabs.map((t) => {
            const active = current === t.id;
            return (
              <button key={t.id} onClick={() => { if (t.id === "settings") setSettingsStart("main"); go(t.id); }} aria-current={active ? "page" : undefined}
                className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[11px]", active ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                <span className={cn("flex h-8 w-14 items-center justify-center rounded-full transition-colors", active ? "bg-primary text-primary-foreground shadow-sm" : "")}>
                  <t.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                </span>
                <span className="max-w-full truncate px-1">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
