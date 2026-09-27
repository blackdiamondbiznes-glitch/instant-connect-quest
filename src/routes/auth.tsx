import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Admin kirish — KabinetAI" },
      { name: "description", content: "KabinetAI platforma admin paneliga kirish." },
      { property: "og:title", content: "Admin kirish — KabinetAI" },
      { property: "og:description", content: "Platforma admin paneliga kirish." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/admin" }); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (s) navigate({ to: "/admin" }); });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (mode === "up" && !data.session) toast.success("Emailingizga tasdiqlash havolasi yuborildi.");
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if ((r as any)?.error) toast.error(String((r as any).error.message ?? "Xatolik"));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6">
        <h1 className="font-display text-2xl font-bold">Admin panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">{mode === "in" ? "Hisobingizga kiring" : "Yangi hisob yarating"}</p>
        <Button variant="outline" className="mt-5 w-full" onClick={google}>Google orqali kirish</Button>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" required minLength={6} placeholder="Parol" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Kirish" : "Ro'yxatdan o'tish"}</Button>
        </form>
        <button className="mt-4 text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Hisob yo'qmi? Ro'yxatdan o'ting" : "Hisob bormi? Kiring"}
        </button>
      </div>
    </div>
  );
}
