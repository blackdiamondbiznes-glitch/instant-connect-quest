import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, MessageCircleQuestion, Gauge, LayoutDashboard, Languages } from "lucide-react";
import { NICHES } from "@/lib/niches";
import { Link } from "@tanstack/react-router";
import { DemoSandbox } from "@/components/DemoSandbox";

const BOT_URL = "https://t.me/KabinetAI_bot";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "KabinetAI — Telegram faoliyatingiz uchun shaxsiy kabinet" },
      { name: "description", content: "O'qituvchi, sotuvchi, shifokor, psixolog va boshqalar uchun Telegram bot: to'lovlar, qarzdorlar, AI kayfiyat tahlili va savollarni guruhlash." },
      { property: "og:title", content: "KabinetAI — Telegram professional kabinet" },
      { property: "og:description", content: "Sohangizga mos kabinet va AI bilan jamoangizni tushuning." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-bold tracking-tight">Kabinet<span className="text-accent">AI</span></span>
        
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-10 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Languages className="h-3.5 w-3.5" /> O'zbek · Русский · English
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Telegramdagi ishingiz — <span className="bg-accent px-2 text-accent-foreground">bitta kabinetda</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Botga /start bosing, sohangizni tanlang — to'lov qilganlar, qarzdorlar, nofaollar va AI tahlil bilan tayyor shaxsiy kabinet oling.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={BOT_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground transition hover:opacity-90">
              Botni ishga tushirish <ArrowRight className="h-4 w-4" />
            </a>
            <Link to="/demo" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 font-semibold transition hover:bg-muted">Demoni ko'rish</Link>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Haftalik kayfiyat</p>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full">
            <div className="bg-success" style={{ width: "62%" }} />
            <div className="bg-chart-2" style={{ width: "23%" }} />
            <div className="bg-destructive" style={{ width: "15%" }} />
          </div>
          <div className="mt-3 flex justify-between text-sm">
            <span><b>62%</b> ijobiy</span><span><b>23%</b> neytral</span><span><b>15%</b> norozi</span>
          </div>
          <div className="mt-6 space-y-2">
            {[["Uy vazifasi qachon tekshiriladi?", 14], ["To'lovni qaysi kartaga qilaman?", 9], ["Dars yozuvi qayerda?", 6]].map(([q, n]) => (
              <div key={q as string} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm">
                <span>{q}</span><span className="rounded-md bg-accent px-2 py-0.5 font-bold text-accent-foreground">×{n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-2xl font-bold">Imkoniyatlar</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
          {[
            { i: LayoutDashboard, t: "Sohangizga mos kabinet", d: "O'qituvchiga to'lovlar va qarzdorlar, sotuvchiga buyurtmalar, shifokorga qabullar va kelmaganlar." },
            { i: Gauge, t: "AI kayfiyat tahlili", d: "A'zolar kayfiyati foizlarda, eng ko'p muhokama qilinayotgan mavzular va norozilik sabablari." },
            { i: MessageCircleQuestion, t: "Bir javob — hammaga", d: "Bir xil ma'nodagi savollar guruhlanadi. Bir marta javob bering — bot hammaga yetkazadi." },
          ].map(({ i: I, t, d }) => (
            <div key={t}>
              <I className="h-6 w-6 text-accent" />
              <h2 className="mt-4 font-display text-lg font-bold">{t}</h2>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </div>
          ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-2xl font-bold">10 ta soha uchun tayyor shablon</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {NICHES.map((n) => (
            <span key={n.id} className="rounded-full border border-border bg-card px-4 py-2 text-sm">{n.emoji} {n.name.uz}</span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">Jonli demo: kabinetni hoziroq sinab ko'ring</h2>
          <Link to="/demo" className="text-sm font-semibold text-primary hover:underline">To'liq ekranda ochish →</Link>
        </div>
        <div className="mt-6"><DemoSandbox /></div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">© KabinetAI</footer>
    </div>
  );
}
