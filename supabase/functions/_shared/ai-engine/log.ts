// Moteur IA A/B/C — écriture du turn instrumenté (spec §4)
import type { TurnLog } from "./types.ts";

export async function logTurn(supabase: any, turn: TurnLog): Promise<void> {
  const row = {
    chat_id: turn.chatId ?? null,
    user_id: turn.userId ?? null,
    user_message: turn.message ?? null,
    intent_classified: turn.route,
    route_taken: turn.route,
    ai_class: turn.aiClass,
    classifier_confidence: turn.confidence ?? null,
    fallback_reason: turn.fallbackReason ?? null,
    surface: turn.surface,
    model: turn.model ?? null,
    tokens_in: turn.tokensIn ?? 0,
    tokens_out: turn.tokensOut ?? 0,
    cost_usd: turn.costUsd ?? 0,
    latency_ms_total: turn.latencyMsTotal ?? null,
    latency_ms_first_token: turn.latencyMsFirstToken ?? null,
    results_count: turn.resultsCount ?? null,
    had_error: turn.hadError ?? false,
    stream_completed: turn.streamCompleted ?? true,
    city_active: turn.cityActive ?? null,
    city_detected: turn.cityDetected ?? null,
    language: turn.language ?? null,
    resolved_targets: turn.resolvedTargets ?? null,
    resolved_types: turn.resolvedTypes ?? null,
    resolution_unresolved: turn.resolutionUnresolved ?? null,
    resolution_service_only: turn.resolutionServiceOnly ?? null,
  };

  try {
    const { error } = await supabase.from("ai_conversation_turns").insert(row);
    if (error) console.error("[ai-engine/log] insert failed", error);
  } catch (e) {
    console.error("[ai-engine/log] exception", e);
  }
}
