import { toast } from "sonner";
import type { getCabinet } from "@/lib/cabinet.functions";
import { isUKey, type U } from "./i18n";

export type D = Awaited<ReturnType<typeof getCabinet>>;

/** Telegram Mini App initData; sent with every call and verified server-side for writes. */
export const tgInit = () =>
  typeof window === "undefined" ? "" : ((window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData ?? "");

type Res = { ok: boolean; error?: string | null };

/** Returns true on success; otherwise shows a localized toast for the server's error code. */
export function okOrToast(r: Res, u: U): boolean {
  if (r.ok) return true;
  toast.error(isUKey(r.error) ? u(r.error) : u("error"));
  return false;
}

/** Wraps a server call: localized error toast on failure, optional success toast. */
export async function run<T extends Res>(fn: () => Promise<T>, u: U, success?: string): Promise<T | null> {
  try {
    const r = await fn();
    if (!okOrToast(r, u)) return null;
    if (success) toast.success(success);
    return r;
  } catch {
    toast.error(u("error"));
    return null;
  }
}

export const toneCls = (tone?: string) =>
  tone === "good" ? "bg-success text-success-foreground"
  : tone === "bad" ? "bg-destructive text-destructive-foreground"
  : tone === "warn" ? "bg-warning text-warning-foreground"
  : "bg-secondary text-secondary-foreground";

export const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n));

export const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block space-y-1">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
  </label>
);

export const Card = ({ className = "", children }: { className?: string; children: React.ReactNode }) => (
  <section className={`rounded-2xl border border-border bg-card p-4 ${className}`}>{children}</section>
);
