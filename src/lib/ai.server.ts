import type { z } from "zod";

export type AiFailure = "credits" | "rate" | "ai";
export type AiResult<T> = { ok: true; value: T } | { ok: false; error: AiFailure };

const MODEL = process.env["AI_MODEL"] || "openai/gpt-6-astra";

export const langName = (lang: string) => ({ uz: "Uzbek (Latin script)", ru: "Russian", en: "English" })[lang as "uz"] ?? "Uzbek (Latin script)";

/** Structured LLM call through the Lovable AI gateway. Maps provider failures to a specific reason. */
export async function aiObject<S extends z.ZodTypeAny>(p: { schema: S; system: string; prompt: string }): Promise<AiResult<z.infer<S>>> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { ok: false, error: "ai" };
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText, Output } = await import("ai");
  const { createLovableAiGatewayRunIdFetch } = await import("./ai-gateway.server");
  const lovable = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: createLovableAiGatewayRunIdFetch().fetch,
  });
  try {
    const result = streamText({
      model: lovable.responses(MODEL),
      output: Output.object({ schema: p.schema }),
      system: p.system,
      prompt: p.prompt,
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", store: false, include: ["reasoning.encrypted_content"] } },
    });
    return { ok: true, value: (await result.output) as z.infer<S> };
  } catch (e: any) {
    console.error("AI call failed", e);
    const status = e?.statusCode ?? e?.cause?.statusCode;
    return { ok: false, error: status === 402 ? "credits" : status === 429 ? "rate" : "ai" };
  }
}
