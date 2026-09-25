import { createFileRoute, Link } from "@tanstack/react-router";
import { DemoSandbox } from "@/components/DemoSandbox";

export const Route = createFileRoute("/demo")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Demo — 10 soha uchun shaxsiy kabinet | KabinetAI" },
      { name: "description", content: "Sotuvchi, o'qituvchi, shifokor, psixolog va boshqa sohalar uchun KabinetAI kabinetini ro'yxatdan o'tmasdan sinab ko'ring." },
      { property: "og:title", content: "KabinetAI demo — kabinetni sinab ko'ring" },
      { property: "og:description", content: "10 ta soha uchun tayyor shaxsiy kabinetni interaktiv sinab ko'ring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-display text-lg font-bold tracking-tight">Kabinet<span className="text-accent">AI</span></Link>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Kabinetni sinab ko'ring</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Sohani tanlang — tayyor namuna ma'lumotlari bilan shaxsiy kabinet ochiladi. Qo'shing, tahrirlang, AI tahlilni ko'ring.</p>
        <div className="mt-8"><DemoSandbox /></div>
      </main>
    </div>
  );
}
