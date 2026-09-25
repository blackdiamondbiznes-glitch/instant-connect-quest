import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { getDemoCabinets } from "@/lib/demo.functions";
import { NICHES } from "@/lib/niches";
import { cn } from "@/lib/utils";

export function DemoSandbox() {
  const fn = useServerFn(getDemoCabinets);
  const q = useQuery({ queryKey: ["demo-cabinets"], queryFn: () => fn() });
  const [niche, setNiche] = useState("tutor");
  const niches = NICHES.filter((n) => n.id !== "other");
  const token = q.data?.find((d) => d.niche === niche)?.token;

  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      <div className="flex flex-wrap gap-2 md:flex-col">
        {niches.map((n) => (
          <button
            key={n.id}
            onClick={() => setNiche(n.id)}
            className={cn("rounded-xl border px-4 py-2.5 text-left text-sm transition", niche === n.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}
          >
            {n.emoji} {n.name.uz}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        {token ? (
          <iframe key={token} title="Demo kabinet" src={`/cabinet/${token}`} className="h-[720px] w-full" />
        ) : (
          <div className="flex h-[720px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}
      </div>
    </div>
  );
}
