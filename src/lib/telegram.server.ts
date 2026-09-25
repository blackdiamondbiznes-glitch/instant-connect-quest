import { createHash } from "crypto";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

export function webhookSecret(key: string) {
  return createHash("sha256").update(`telegram-webhook:${key}`).digest("base64url");
}

export async function tg<T = any>(method: string, body: Record<string, unknown>): Promise<T> {
  const lk = process.env["LOVABLE_API_KEY"];
  const tk = process.env["TELEGRAM_API_KEY"];
  if (!lk || !tk) throw new Error("Telegram is not configured");
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": tk, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Telegram ${method} failed [${res.status}]: ${text}`);
    throw new Error(`Telegram ${method} failed [${res.status}]: ${text}`);
  }
  const json = JSON.parse(text);
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json.result as T;
}
