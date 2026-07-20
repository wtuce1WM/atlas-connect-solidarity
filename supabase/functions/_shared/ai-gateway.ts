// Shared AI Gateway wrapper + usage tracking for Lovable AI Gateway.
// Usage is logged to public.ai_usage_events so we can attribute cost per user / affiliate / business.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface AiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface AiGatewayLogOptions {
  supabase: any;
  userId?: string | null;
  affiliateId?: string | null;
  businessId?: string | null;
  chatId?: string | null;
  context: string;
  model: string;
  metadata?: Record<string, any>;
}

export interface ResolvedCallerContext {
  userId: string | null;
  affiliateId: string | null;
}

// Approximate per-model rates (USD per 1M tokens). Used for cost estimates only.
const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "google/gemini-3-flash-preview": { input: 0.15, output: 0.60 },
  "google/gemini-3-pro-preview": { input: 1.25, output: 5.00 },
  "google/gemini-2.5-flash-preview": { input: 0.15, output: 0.60 },
  "google/gemini-2.5-pro-preview": { input: 1.25, output: 5.00 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.60 },
  "openai/gpt-4o": { input: 2.50, output: 10.00 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const rate = MODEL_RATES[model] || MODEL_RATES["google/gemini-3-flash-preview"];
  const inp = (inputTokens || 0) / 1_000_000 * rate.input;
  const out = (outputTokens || 0) / 1_000_000 * rate.output;
  const rounded = Math.round((inp + out) * 100_000_000) / 100_000_000;
  return rounded;
}

export async function resolveAffiliateId(
  supabase: any,
  userId: string | null,
): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase.rpc("resolve_affiliate_id", { _user_id: userId });
    if (error) {
      console.error("[resolveAffiliateId] rpc error", error);
      return null;
    }
    return data || null;
  } catch (e) {
    console.error("[resolveAffiliateId] exception", e);
    return null;
  }
}

export async function resolveCallerContext(
  supabase: any,
  userId: string | null,
): Promise<ResolvedCallerContext> {
  if (!userId) return { userId: null, affiliateId: null };
  const affiliateId = await resolveAffiliateId(supabase, userId);
  return { userId, affiliateId };
}

export async function logAiUsageEvent(
  supabase: any,
  options: {
    userId?: string | null;
    affiliateId?: string | null;
    businessId?: string | null;
    chatId?: string | null;
    context: string;
    model: string;
    usage?: AiUsage | null;
    metadata?: Record<string, any>;
    status?: "success" | "error";
    errorMessage?: string | null;
    requestId?: string | null;
  },
): Promise<void> {
  const input = options.usage?.prompt_tokens || 0;
  const output = options.usage?.completion_tokens || 0;
  const total = options.usage?.total_tokens ?? (input + output);
  const cost = estimateCostUsd(options.model, input, output);

  const row = {
    user_id: options.userId || null,
    affiliate_id: options.affiliateId || null,
    business_id: options.businessId || null,
    chat_id: options.chatId || null,
    context: options.context,
    model: options.model,
    input_tokens: input,
    output_tokens: output,
    total_tokens: total,
    estimated_cost_usd: cost,
    metadata: options.metadata || {},
    status: options.status || "success",
    error_message: options.errorMessage || null,
    request_id: options.requestId || null,
  };

  try {
    const { error } = await supabase.from("ai_usage_events").insert(row);
    if (error) {
      console.error("[ai_usage_events] insert failed", error, row);
    }
  } catch (e) {
    console.error("[ai_usage_events] insert exception", e);
  }
}

/**
 * Wrapper around fetch() to the Lovable AI Gateway that logs token usage.
 * Returns the original Response (so callers can still read it once).
 */
export async function fetchAiGateway(
  url: string,
  init: RequestInit,
  logOptions: AiGatewayLogOptions,
): Promise<Response> {
  const requestStart = Date.now();
  const resp = await fetch(url, init);

  let usage: AiUsage | null = null;
  let status: "success" | "error" = resp.ok ? "success" : "error";
  let errorMessage: string | null = null;
  let requestId: string | null = null;

  try {
    requestId = resp.headers.get("x-request-id") || null;
    const clone = resp.clone();
    if (resp.ok) {
      const json = await clone.json();
      usage = json?.usage || null;
    } else {
      errorMessage = (await clone.text()).slice(0, 500);
    }
  } catch (e) {
    // ignore body parsing errors — we still log the request
  }

  await logAiUsageEvent(logOptions.supabase, {
    ...logOptions,
    usage,
    status,
    errorMessage,
    requestId,
    metadata: {
      ...(logOptions.metadata || {}),
      duration_ms: Date.now() - requestStart,
    },
  });

  return resp;
}

/**
 * Convenience: logs a fallback/estimated event when the real response is not
 * available (e.g. streamed response, or external AI provider).
 */
export async function logAiUsageEstimate(
  supabase: any,
  options: {
    userId?: string | null;
    affiliateId?: string | null;
    businessId?: string | null;
    chatId?: string | null;
    context: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    metadata?: Record<string, any>;
    status?: "success" | "error";
    errorMessage?: string | null;
  },
): Promise<void> {
  await logAiUsageEvent(supabase, {
    ...options,
    usage: {
      prompt_tokens: options.inputTokens || 0,
      completion_tokens: options.outputTokens || 0,
    },
  });
}
