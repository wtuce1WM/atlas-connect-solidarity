import { useState, useRef, useCallback, useEffect } from "react";

type TTSStatus = "idle" | "loading" | "playing" | "paused" | "error";

/** Words that trigger a voice-activated stop (case-insensitive) */
const STOP_WORDS = ["stop", "arrête", "arrêter", "tais-toi", "silence"];
/** Words that trigger a voice-activated resume (case-insensitive) */
const RESUME_WORDS = ["continue", "reprends", "reprendre", "play", "lecture"];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Normalize abbreviations for natural speech */
const normalizeTTSText = (text: string): string =>
  text
    .replace(/(\d+)\s*j\s*\/\s*(\d+)/gi, "$1 jours sur $2")
    .replace(/(\d+)\s*h\s*\/\s*(\d+)/gi, "$1 heures sur $2")
    .replace(/24\s*\/\s*24/g, "24 heures sur 24")
    .replace(/7\s*\/\s*7/g, "7 jours sur 7")
    .replace(/(\d+)\s*h\s*(\d+)/gi, "$1 heures $2")
    .replace(/(\d+)\s*h\b/gi, "$1 heures")
    .replace(/(\d+)\s*min\b/gi, "$1 minutes")
    .replace(/(\d+)\s*km\b/gi, "$1 kilomètres")
    .replace(/(\d+)\s*m²/gi, "$1 mètres carrés")
    .replace(/n°\s*/gi, "numéro ")
    .replace(/\betc\b\.?/gi, "et cætera");

export interface TTSAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/** Compute word-level timings from character-level alignment */
const computeWordTimings = (alignment: TTSAlignment): { start: number; end: number }[] => {
  const words: { start: number; end: number }[] = [];
  let inWord = false;
  let wordStart = 0;
  let wordEnd = 0;

  for (let i = 0; i < alignment.characters.length; i++) {
    const isSpace = /\s/.test(alignment.characters[i]);
    if (!isSpace && !inWord) {
      inWord = true;
      wordStart = alignment.character_start_times_seconds[i];
    }
    if (!isSpace) {
      wordEnd = alignment.character_end_times_seconds[i];
    }
    if ((isSpace || i === alignment.characters.length - 1) && inWord) {
      words.push({ start: wordStart, end: wordEnd });
      inWord = false;
    }
  }

  return words;
};

// ─── Audio cache ────────────────────────────────────────────────────────
/** Simple in-memory cache: hash → { blobUrl, alignment? } */
const audioCache = new Map<string, { blobUrl: string; alignment?: TTSAlignment }>();
const MAX_CACHE = 30;

function cacheKey(text: string, voiceId?: string, withTimestamps?: boolean): string {
  return `${voiceId ?? "default"}|${withTimestamps ? "ts" : "no"}|${text.slice(0, 200)}`;
}

function addToCache(key: string, value: { blobUrl: string; alignment?: TTSAlignment }) {
  if (audioCache.size >= MAX_CACHE) {
    // Evict oldest
    const first = audioCache.keys().next().value;
    if (first) {
      const old = audioCache.get(first);
      if (old?.blobUrl.startsWith("blob:")) URL.revokeObjectURL(old.blobUrl);
      audioCache.delete(first);
    }
  }
  audioCache.set(key, value);
}

// ─── Chunking ───────────────────────────────────────────────────────────
/** Split text into chunks of ~maxLen chars at sentence boundaries */
function splitTextChunks(text: string, maxLen = 800): string[] {
  if (text.length <= maxLen) return [text];
  const sentences = text.match(/[^.!?…]+[.!?…]+\s*/g) || [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (current.length + s.length > maxLen && current.length > 0) {
      chunks.push(current.trimEnd());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trimEnd());
  return chunks;
}

// ─── Fetch helper ───────────────────────────────────────────────────────
async function fetchTTSAudio(
  text: string,
  voiceId?: string,
  withTimestamps = false
): Promise<{ blobUrl: string; alignment?: TTSAlignment }> {
  const key = cacheKey(text, voiceId, withTimestamps);
  const cached = audioCache.get(key);
  if (cached) return cached;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ text, voiceId, withTimestamps }),
  });

  if (!response.ok) throw new Error(`TTS request failed: ${response.status}`);

  let blobUrl: string;
  let alignment: TTSAlignment | undefined;

  if (withTimestamps) {
    const data = await response.json();
    alignment = data.alignment;
    blobUrl = `data:audio/mpeg;base64,${data.audio_base64}`;
  } else {
    const blob = await response.blob();
    blobUrl = URL.createObjectURL(blob);
  }

  const result = { blobUrl, alignment };
  addToCache(key, result);
  return result;
}

// ─── Pre-generation (background fetch) ──────────────────────────────────
const preloadingKeys = new Set<string>();

/** Pre-fetch TTS audio in background so it's cached when user clicks play */
export function preloadTTS(text: string, voiceId?: string, withTimestamps = false) {
  if (!text.trim()) return;
  const finalText = withTimestamps ? text : normalizeTTSText(text);
  const key = cacheKey(finalText, voiceId, withTimestamps);
  if (audioCache.has(key) || preloadingKeys.has(key)) return;
  preloadingKeys.add(key);
  fetchTTSAudio(finalText, voiceId, withTimestamps)
    .catch(() => {}) // silent background failure
    .finally(() => preloadingKeys.delete(key));
}

// ─── Hook ───────────────────────────────────────────────────────────────
export function useTextToSpeech(options?: { onEnd?: () => void }) {
  const [status, setStatus] = useState<TTSStatus>("idle");
  const [spokenWordIndex, setSpokenWordIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wordTimingsRef = useRef<{ start: number; end: number }[] | null>(null);
  const rafRef = useRef<number>(0);
  const onEndRef = useRef(options?.onEnd);
  onEndRef.current = options?.onEnd;
  const chunkQueueRef = useRef<string[]>([]);
  const chunkVoiceRef = useRef<string | undefined>();
  const abortRef = useRef(false);

  const stopTracking = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    setSpokenWordIndex(-1);
    wordTimingsRef.current = null;
  }, []);

  const trackPlayback = useCallback(() => {
    const audio = audioRef.current;
    const timings = wordTimingsRef.current;
    if (!audio || !timings || audio.paused) return;

    const t = audio.currentTime;
    let idx = -1;
    let lo = 0;
    let hi = timings.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (timings[mid].start <= t) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    setSpokenWordIndex(idx);
    rafRef.current = requestAnimationFrame(trackPlayback);
  }, []);

  const cleanupAudio = useCallback(() => {
    stopTracking();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, [stopTracking]);

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      stopTracking();
      setStatus("paused");
    }
  }, [stopTracking]);

  const stop = useCallback(() => {
    abortRef.current = true;
    chunkQueueRef.current = [];
    cleanupAudio();
    setStatus("idle");
  }, [cleanupAudio]);

  /** Play a single audio blob URL. Returns a promise that resolves when done. */
  const playAudioUrl = useCallback(
    (blobUrl: string, alignment?: TTSAlignment): Promise<void> =>
      new Promise((resolve, reject) => {
        const audio = new Audio(blobUrl);
        audioRef.current = audio;

        if (alignment) {
          wordTimingsRef.current = computeWordTimings(alignment);
        }

        audio.onplay = () => {
          if (wordTimingsRef.current) {
            rafRef.current = requestAnimationFrame(trackPlayback);
          }
        };

        audio.onended = () => {
          stopTracking();
          audioRef.current = null;
          resolve();
        };

        audio.onerror = () => {
          stopTracking();
          audioRef.current = null;
          reject(new Error("Audio playback error"));
        };

        audio.play().catch(reject);
      }),
    [trackPlayback, stopTracking]
  );

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused && status === "paused") {
      audioRef.current.play();
      setStatus("playing");
      if (wordTimingsRef.current) {
        rafRef.current = requestAnimationFrame(trackPlayback);
      }
    }
  }, [status, trackPlayback]);

  const speak = useCallback(
    async (text: string, voiceId?: string, withTimestamps = false) => {
      // Toggle off if already active
      if (status === "playing" || status === "loading" || status === "paused") {
        stop();
        return;
      }

      if (!text.trim()) return;

      abortRef.current = false;
      const finalText = withTimestamps ? text : normalizeTTSText(text);

      setStatus("loading");
      setSpokenWordIndex(-1);
      wordTimingsRef.current = null;

      try {
        if (withTimestamps) {
          // Timestamps mode: single request (no chunking, alignment needed)
          const result = await fetchTTSAudio(finalText, voiceId, true);
          if (abortRef.current) return;
          setStatus("playing");
          await playAudioUrl(result.blobUrl, result.alignment);
          if (!abortRef.current) {
            setStatus("idle");
            onEndRef.current?.();
          }
        } else {
          // Chunking mode: split text, play first chunk ASAP, prefetch rest
          const chunks = splitTextChunks(finalText);
          chunkQueueRef.current = chunks.slice(1);
          chunkVoiceRef.current = voiceId;

          // Start prefetching chunks 2+ in parallel
          chunks.slice(1).forEach((c) => {
            fetchTTSAudio(c, voiceId, false).catch(() => {});
          });

          // Fetch & play chunk 1
          const first = await fetchTTSAudio(chunks[0], voiceId, false);
          if (abortRef.current) return;
          setStatus("playing");
          await playAudioUrl(first.blobUrl);

          // Play remaining chunks sequentially
          while (chunkQueueRef.current.length > 0 && !abortRef.current) {
            const nextText = chunkQueueRef.current.shift()!;
            const next = await fetchTTSAudio(nextText, voiceId, false);
            if (abortRef.current) return;
            await playAudioUrl(next.blobUrl);
          }

          if (!abortRef.current) {
            setStatus("idle");
            onEndRef.current?.();
          }
        }
      } catch (error) {
        console.error("TTS error:", error);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    },
    [status, stop, playAudioUrl]
  );

  // Voice-activated stop/resume
  const stopRecognitionRef = useRef<any>(null);

  useEffect(() => {
    if (status !== "playing" && status !== "paused") {
      if (stopRecognitionRef.current) {
        try { stopRecognitionRef.current.stop(); } catch {}
        stopRecognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      for (let i = 0; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.toLowerCase().trim();
        if (STOP_WORDS.some(w => text.includes(w))) {
          pause();
          return;
        }
        if (RESUME_WORDS.some(w => text.includes(w))) {
          resume();
          return;
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "aborted" && e.error !== "no-speech") {
        console.warn("[TTS] Stop listener error:", e.error);
      }
    };

    recognition.onend = () => {
      if ((status === "playing" || status === "paused") && stopRecognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    stopRecognitionRef.current = recognition;
    try { recognition.start(); } catch (err) {
      console.warn("[TTS] Could not start stop listener:", err);
    }

    return () => {
      if (stopRecognitionRef.current) {
        try { stopRecognitionRef.current.stop(); } catch {}
        stopRecognitionRef.current = null;
      }
    };
  }, [status, stop, pause, resume]);

  return { speak, stop, pause, resume, status, spokenWordIndex, preload: preloadTTS };
}
