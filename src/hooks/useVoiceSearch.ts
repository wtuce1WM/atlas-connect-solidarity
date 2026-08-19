import { useState, useRef, useCallback, useEffect } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { setScribeMicrophoneSetup, type ScribeMicrophoneConfig } from "@elevenlabs/client/internal";

type VoiceStatus = "idle" | "recording" | "processing" | "error";

interface HotelAvailabilityIntent {
  hotelName: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  rooms?: number;
}

interface FlightSearchIntent {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  adults?: number;
}

interface WebSearchIntent {
  query: string;
}

interface HotelSearchIntent {
  city: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
}

interface UseVoiceSearchOptions {
  onTranscript: (keywords: string, spokenText: string, category?: string, timeKeyword?: string) => void;
  onHotelAvailability?: (intent: HotelAvailabilityIntent, spokenText: string) => void;
  onHotelSearch?: (intent: HotelSearchIntent, spokenText: string) => void;
  onFlightSearch?: (intent: FlightSearchIntent, spokenText: string) => void;
  onWebSearch?: (intent: WebSearchIntent, spokenText: string) => void;
  onError?: (message: string) => void;
  lang?: string;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventInstance) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventInstance) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventInstance {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventInstance {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SCRIBE_SAMPLE_RATE = 16000;

// Detect iOS (iPhone/iPad/iPod, including iPadOS reporting as Mac with touch)
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSClassic = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = ua.includes("Mac") && typeof document !== "undefined" && "ontouchend" in document;
  return iOSClassic || iPadOS;
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function resampleAudio(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return input.slice();
  const ratio = inputRate / outputRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const sourceIndex = i * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(left + 1, input.length - 1);
    const weight = sourceIndex - left;
    output[i] = input[left] * (1 - weight) + input[right] * weight;
  }
  return output;
}

function pcm16Base64FromFloat32(input: Float32Array): string {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return base64FromBytes(new Uint8Array(buffer));
}

// Skip the first N ms of mic audio on iOS: AGC/AEC + AudioContext need time to
// calibrate, and the very first PCM frames are noisy/under-leveled — which
// destroys the beginning of the first Scribe transcription of the session.
const MIC_WARMUP_MS = 700;

async function setupScribeMicrophoneFromStream(
  stream: MediaStream,
  audioContext: AudioContext,
  onAudioData: (base64Audio: string) => void,
  onWarmupComplete?: () => void,
) {
  const [audioTrack] = stream.getAudioTracks();
  if (!audioTrack || audioTrack.readyState === "ended") throw new Error("Microphone indisponible");

  if (audioContext.state === "suspended") await audioContext.resume();

  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;

  const warmupUntil = (typeof performance !== "undefined" ? performance.now() : Date.now()) + MIC_WARMUP_MS;
  let warmupLogged = false;

  processor.onaudioprocess = (event) => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now < warmupUntil) {
      // Drop frames during AGC/AEC warm-up — don't ship noisy audio to Scribe.
      return;
    }
    if (!warmupLogged) {
      console.log("[Scribe] mic warm-up done, streaming audio");
      warmupLogged = true;
      onWarmupComplete?.();
    }
    const input = event.inputBuffer.getChannelData(0);
    const resampled = resampleAudio(input, audioContext.sampleRate, SCRIBE_SAMPLE_RATE);
    onAudioData(pcm16Base64FromFloat32(resampled));
  };

  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(audioContext.destination);

  return {
    mediaStreamTrack: audioTrack,
    cleanup: () => {
      processor.disconnect();
      source.disconnect();
      silentGain.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      if (audioContext.state !== "closed") void audioContext.close();
    },
  };
}

async function extractSearchIntent(transcript: string): Promise<{ query: string; category: string; timeKeyword: string; intent: string; hotelAvailability: HotelAvailabilityIntent | null; hotelSearch: HotelSearchIntent | null; flightSearch: FlightSearchIntent | null; webSearch: WebSearchIntent | null }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/voice-search-intent`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transcript }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return {
      query: data.query?.trim() || transcript,
      category: data.category?.trim() || "",
      timeKeyword: data.timeKeyword?.trim() || "",
      intent: data.intent?.trim() || "",
      hotelAvailability: data.hotelAvailability || null,
      hotelSearch: data.hotelSearch || null,
      flightSearch: data.flightSearch || null,
      webSearch: data.webSearch || null,
    };
  } catch (err) {
    console.warn("LLM intent extraction failed, using raw transcript:", err);
    return { query: transcript, category: "", timeKeyword: "", intent: "", hotelAvailability: null, hotelSearch: null, flightSearch: null, webSearch: null };
  }
}

const SILENCE_DELAY_MS = 2000;
const SILENCE_DELAY_MS_ANDROID = 1300;
const MAX_RECORDING_MS = 30000;
const DUPLICATE_PHRASE_MAX_WORDS = 6;

// Mots de remplissage français à supprimer (n'apportent rien à la recherche).
const FILLER_WORDS = new Set([
  "euh", "euhh", "heu", "heuu", "hum", "hummm", "bah", "ben", "bof",
  "alors", "voila", "voilà", "genre",
]);
// Phrases-filler supprimées en bloc (sinon "du" reste utile, ex: "ryad du sud").
const FILLER_PHRASES: string[][] = [["du", "coup"], ["tu", "vois"], ["en", "fait"]];

// Variantes phonétiques fréquentes que le STT confond en français marocain.
const PHONETIC_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bmarakech\b/gi, "marrakech"],
  [/\bmarrakesh\b/gi, "marrakech"],
  [/\bmarakesh\b/gi, "marrakech"],
  [/\bessawira\b/gi, "essaouira"],
  [/\bessaouirah\b/gi, "essaouira"],
  [/\bmogador\b/gi, "essaouira"],
  [/\briad\b/gi, "ryad"],
  [/\briyad\b/gi, "ryad"],
  [/\briyadh\b/gi, "ryad"],
  [/\bquade\b/gi, "quad"],
  [/\bkart\b/gi, "karting"],
  [/\bouarzazat\b/gi, "ouarzazate"],
  [/\bouarzazatte\b/gi, "ouarzazate"],
  [/\btennise\b/gi, "tennis"],
];

function applyPhoneticNormalization(text: string): string {
  let out = text;
  for (const [re, rep] of PHONETIC_REPLACEMENTS) out = out.replace(re, rep);
  return out;
}

function stripFillerWords(words: string[]): string[] {
  const norm = (w: string) => w.toLocaleLowerCase("fr-FR").replace(/[.,!?;:]/g, "");
  // 1) Supprimer les phrases-filler (séquences de mots)
  const filtered: string[] = [];
  for (let i = 0; i < words.length; i++) {
    let matched = false;
    for (const phrase of FILLER_PHRASES) {
      if (i + phrase.length <= words.length) {
        let ok = true;
        for (let j = 0; j < phrase.length; j++) {
          if (norm(words[i + j]) !== phrase[j]) { ok = false; break; }
        }
        if (ok) { i += phrase.length - 1; matched = true; break; }
      }
    }
    if (!matched) filtered.push(words[i]);
  }
  // 2) Supprimer les fillers isolés
  return filtered.filter((w) => !FILLER_WORDS.has(norm(w)));
}

function normalizeVoiceTranscript(transcript: string): string {
  // Normalisation phonétique d'abord (avant tokenisation).
  const phoneticallyClean = applyPhoneticNormalization(transcript);
  let words = phoneticallyClean.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const clean = (word: string) => word.toLocaleLowerCase("fr-FR").replace(/[.,!?;:]/g, "");

  // Déduplication des répétitions adjacentes (1 à N mots).
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < words.length - 1; i++) {
      const maxLen = Math.min(DUPLICATE_PHRASE_MAX_WORDS, Math.floor((words.length - i) / 2));
      for (let len = maxLen; len >= 1; len--) {
        let same = true;
        for (let offset = 0; offset < len; offset++) {
          if (clean(words[i + offset]) !== clean(words[i + len + offset])) {
            same = false;
            break;
          }
        }
        if (same) {
          words.splice(i + len, len);
          changed = true;
          break outer;
        }
      }
    }
  }

  // Suppression des mots/phrases de remplissage.
  words = stripFillerWords(words);

  return words.join(" ").trim();
}

export function useVoiceSearch({ onTranscript, onHotelAvailability, onHotelSearch, onFlightSearch, onWebSearch, onError, lang = "fr-FR" }: UseVoiceSearchOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [micReady, setMicReady] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTranscriptRef = useRef<string>("");
  const pendingScribeStreamRef = useRef<MediaStream | null>(null);
  const pendingScribeAudioContextRef = useRef<AudioContext | null>(null);
  // Fallback Android : on enregistre l'audio en parallèle de Web Speech API
  // pour pouvoir le transcrire côté serveur (ElevenLabs Scribe) si Android STT échoue.
  const fallbackRecorderRef = useRef<MediaRecorder | null>(null);
  const fallbackStreamRef = useRef<MediaStream | null>(null);
  const fallbackChunksRef = useRef<Blob[]>([]);
  // Niveau audio (VU-mètre) pour animer le bouton micro pendant l'écoute.
  const levelStreamRef = useRef<MediaStream | null>(null);
  const levelCtxRef = useRef<AudioContext | null>(null);
  const levelRafRef = useRef<number | null>(null);

  // Beep de signal "micro prêt, parlez maintenant". Sur iOS/desktop il n'y a
  // pas de cue système comme sur Android, on en synthétise un.
  const beepCtxRef = useRef<AudioContext | null>(null);
  const ensureBeepContext = useCallback(() => {
    // Doit être créé dans un user gesture (start du recording) pour pouvoir
    // jouer plus tard sans être bloqué par les autoplay policies.
    if (!beepCtxRef.current || beepCtxRef.current.state === "closed") {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        beepCtxRef.current = new Ctx();
      } catch { /* ignore */ }
    }
    if (beepCtxRef.current?.state === "suspended") {
      void beepCtxRef.current.resume();
    }
  }, []);
  const playReadyBeep = useCallback(() => {
    const ctx = beepCtxRef.current;
    if (!ctx || ctx.state === "closed") return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch { /* ignore */ }
  }, []);


  const stopAudioLevelMonitor = useCallback(() => {
    if (levelRafRef.current != null) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    levelStreamRef.current?.getTracks().forEach((t) => t.stop());
    levelStreamRef.current = null;
    if (levelCtxRef.current && levelCtxRef.current.state !== "closed") {
      void levelCtxRef.current.close();
    }
    levelCtxRef.current = null;
    setAudioLevel(0);
  }, []);

  const startAudioLevelMonitor = useCallback(async () => {
    try {
      if (levelStreamRef.current) return; // déjà actif
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      levelStreamRef.current = stream;
      const ctx = new AudioContext();
      levelCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        // RMS normalisé sur la déviation par rapport au centre (128).
        let sumSq = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / buffer.length);
        // Boost perceptif + clamp 0..1.
        const level = Math.min(1, rms * 3.5);
        setAudioLevel(level);
        levelRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn("[VoiceSearch] audio level monitor unavailable:", e);
    }
  }, []);



  // Garder les callbacks en ref pour éviter les problèmes de closure dans les handlers async
  const onTranscriptRef = useRef(onTranscript);
  const onHotelAvailabilityRef = useRef(onHotelAvailability);
  const onHotelSearchRef = useRef(onHotelSearch);
  const onFlightSearchRef = useRef(onFlightSearch);
  const onWebSearchRef = useRef(onWebSearch);
  const onErrorRef = useRef(onError);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onHotelAvailabilityRef.current = onHotelAvailability; }, [onHotelAvailability]);
  useEffect(() => { onHotelSearchRef.current = onHotelSearch; }, [onHotelSearch]);
  useEffect(() => { onFlightSearchRef.current = onFlightSearch; }, [onFlightSearch]);
  useEffect(() => { onWebSearchRef.current = onWebSearch; }, [onWebSearch]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearMaxDurationTimer = useCallback(() => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const processTranscript = useCallback(async (transcript: string) => {
    const cleanedTranscript = normalizeVoiceTranscript(transcript);
    console.log("[VoiceSearch] raw:", JSON.stringify(transcript), "→ cleaned:", JSON.stringify(cleanedTranscript));
    if (!cleanedTranscript.trim()) {
      setStatus("idle");
      onErrorRef.current?.("Aucun texte détecté, réessayez.");
      return;
    }
    setStatus("processing");
    const { query: keywords, category, timeKeyword, intent, hotelAvailability, hotelSearch, flightSearch, webSearch } = await extractSearchIntent(cleanedTranscript);
    setStatus("idle");

    if (intent === "hotelAvailability" && hotelAvailability && onHotelAvailabilityRef.current) {
      onHotelAvailabilityRef.current(hotelAvailability, cleanedTranscript);
    } else if (intent === "hotelSearch" && hotelSearch && onHotelSearchRef.current) {
      onHotelSearchRef.current(hotelSearch, cleanedTranscript);
    } else if (intent === "flightSearch" && flightSearch && onFlightSearchRef.current) {
      onFlightSearchRef.current(flightSearch, cleanedTranscript);
    } else if (intent === "webSearch" && webSearch && onWebSearchRef.current) {
      onWebSearchRef.current(webSearch, cleanedTranscript);
    } else if (keywords) {
      onTranscriptRef.current(keywords, cleanedTranscript, category || undefined, timeKeyword || undefined);
    } else {
      console.warn("[VoiceSearch] no keywords from intent extraction. cleaned:", cleanedTranscript);
      onErrorRef.current?.("Aucun texte détecté, réessayez.");
    }
  }, []);

  // ---- Fallback Android : enregistre l'audio en parallèle pour le réutiliser
  // si Web Speech API ne renvoie rien (échec silencieux fréquent sur Android).
  const startFallbackRecorder = useCallback(async () => {
    if (!isAndroid()) return;
    try {
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
      if (!mimeType) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      const recorder = new MediaRecorder(stream, { mimeType });
      fallbackChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) fallbackChunksRef.current.push(e.data); };
      recorder.start(250);
      fallbackRecorderRef.current = recorder;
      fallbackStreamRef.current = stream;
    } catch (e) {
      console.warn("[VoiceSearch] fallback recorder unavailable:", e);
    }
  }, []);

  const stopFallbackRecorderAndGetBlob = useCallback(async (): Promise<Blob | null> => {
    const recorder = fallbackRecorderRef.current;
    const stream = fallbackStreamRef.current;
    fallbackRecorderRef.current = null;
    fallbackStreamRef.current = null;
    if (!recorder) return null;
    return new Promise((resolve) => {
      const done = () => {
        stream?.getTracks().forEach((t) => t.stop());
        const chunks = fallbackChunksRef.current;
        fallbackChunksRef.current = [];
        if (!chunks.length) return resolve(null);
        resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      };
      if (recorder.state === "inactive") return done();
      recorder.onstop = done;
      try { recorder.stop(); } catch { done(); }
    });
  }, []);

  const transcribeFallbackBlob = useCallback(async (blob: Blob): Promise<string> => {
    if (blob.size < 2048) return "";
    const fd = new FormData();
    fd.append("audio", blob, "recording.webm");
    // Force la langue attendue pour éviter les auto-détections en asiatique
    // sur des fragments courts/bruités.
    fd.append("language", (lang || "fr-FR").slice(0, 2).toLowerCase());
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-transcribe`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: fd,
      });
      if (!res.ok) {
        console.warn("[VoiceSearch] fallback transcribe HTTP", res.status);
        return "";
      }
      const data = await res.json();
      return (data?.text || "").trim();
    } catch (e) {
      console.warn("[VoiceSearch] fallback transcribe failed:", e);
      return "";
    }
  }, [lang]);


  // On iOS, the native Web Speech API uses Siri's local dictation which is
  // very poor in French and on proper nouns. On Android (Samsung Chrome
  // notably), Web Speech is also unreliable: multiple concurrent getUserMedia
  // streams (recognition + fallback recorder + VU-meter) often fail, and the
  // native STT mangles French proper nouns. We use ElevenLabs Scribe realtime
  // on both platforms — desktop-grade quality, single mic stream.
  const useScribePath = isIOS() || isAndroid();
  const scribeFinalRef = useRef<string>("");
  const scribePartialRef = useRef<string>("");

  const finishScribeRef = useRef<() => void>(() => {});
  /** True dès qu'un transcript de la session courante a été consommé (traité).
   *  Empêche un second finish/close (clic micro après l'auto-finish du timer
   *  de silence) d'émettre un faux "Aucun texte détecté". */
  const transcriptConsumedRef = useRef(false);


  const scheduleScribeAutoFinish = useCallback(() => {
    clearSilenceTimer();
    const candidate = `${scribeFinalRef.current} ${scribePartialRef.current}`.trim();
    if (candidate) {
      silenceTimerRef.current = setTimeout(() => {
        console.log("[Scribe] silence timer fired -> auto-finish");
        finishScribeRef.current();
      }, SILENCE_DELAY_MS);
    }
  }, [clearSilenceTimer]);

  // Force la langue de reconnaissance sur celle de l'app (fr/en/ar) au lieu
  // de laisser Scribe auto-détecter — sinon un fragment court/bruité est
  // parfois transcrit en coréen/chinois, et l'IA répond dans cette langue.
  const scribeLangCode = (lang || "fr-FR").slice(0, 2).toLowerCase();
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    languageCode: scribeLangCode,
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data: { text: string }) => {
      console.log("[Scribe] partial:", data.text);
      scribePartialRef.current = data.text || "";
      setLiveTranscript(`${scribeFinalRef.current} ${scribePartialRef.current}`.trim());
      // iOS/Scribe can stay on partial text without emitting a committed segment.
      scheduleScribeAutoFinish();
    },
    onCommittedTranscript: (data: { text: string }) => {
      console.log("[Scribe] committed:", data.text);
      scribeFinalRef.current = (scribeFinalRef.current + " " + (data.text || "")).trim();
      scribePartialRef.current = "";
      setLiveTranscript(scribeFinalRef.current);
      // Auto-finish after SILENCE_DELAY_MS of no new partials/commits
      scheduleScribeAutoFinish();
    },
  });

  const startScribeRecording = useCallback(async () => {
    let mediaStream = pendingScribeStreamRef.current;
    let audioContext = pendingScribeAudioContextRef.current;
    pendingScribeStreamRef.current = null;
    pendingScribeAudioContextRef.current = null;

    try {
      scribeFinalRef.current = "";
      scribePartialRef.current = "";
      setLiveTranscript("");
      setStatus("recording");
      // Do NOT set micReady=true yet — wait for the mic warm-up to complete
      // (see setupScribeMicrophoneFromStream). Otherwise the user starts
      // speaking immediately, and the first ~700ms of audio (which is dropped
      // during AGC/AEC warm-up) eats the first words → "langouste Essaouira"
      // → "Ypa!" on cold start.
      setMicReady(false);

      if (!mediaStream) {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        });
      }
      if (!audioContext) {
        const sampleRate = mediaStream.getAudioTracks()[0]?.getSettings().sampleRate;
        audioContext = new AudioContext(sampleRate ? { sampleRate } : undefined);
      }

      setScribeMicrophoneSetup(async (_config: ScribeMicrophoneConfig, onAudioData) => {
        if (!mediaStream || !audioContext) throw new Error("Microphone indisponible");
        const result = await setupScribeMicrophoneFromStream(
          mediaStream,
          audioContext,
          onAudioData,
          () => {
            // Beep d'abord, "Parlez maintenant" ensuite (cf. onstart Web Speech).
            playReadyBeep();
            setTimeout(() => setMicReady(true), 450);
          },
        );

        mediaStream = null;
        audioContext = null;
        return result;
      });

      const res = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-scribe-token`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`Token HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.token) throw new Error("Pas de token reçu");

      console.log("[Scribe] connecting…");
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log("[Scribe] connected");
      // Hard safety cap: stop after MAX_RECORDING_MS even if no transcript ever arrives
      clearMaxDurationTimer();
      maxDurationTimerRef.current = setTimeout(() => {
        console.warn("[Scribe] max duration reached -> auto-finish");
        finishScribeRef.current();
      }, MAX_RECORDING_MS);
    } catch (e) {
      console.error("[Scribe] start failed:", e);
      mediaStream?.getTracks().forEach((track) => track.stop());
      if (audioContext && audioContext.state !== "closed") void audioContext.close();
      setStatus("idle");
      const msg = e instanceof Error ? e.message : String(e);
      if (/permission|denied|NotAllowed/i.test(msg)) {
        onErrorRef.current?.("Microphone bloqué. Autorisez le micro dans les réglages Safari.");
      } else {
        onErrorRef.current?.(`Erreur vocale: ${msg}`);
      }
    }
  }, [scribe, playReadyBeep]);

  const stopScribeRecording = useCallback(async () => {
    console.log("[Scribe] stop (user)");
    clearSilenceTimer();
    clearMaxDurationTimer();
    try { await scribe.disconnect(); } catch { /* ignore */ }
    scribeFinalRef.current = "";
    scribePartialRef.current = "";
    setLiveTranscript("");
    setStatus("idle");
  }, [scribe, clearSilenceTimer, clearMaxDurationTimer]);

  const finishScribeRecording = useCallback(async () => {
    console.log("[Scribe] finish -> disconnect & process");
    clearSilenceTimer();
    clearMaxDurationTimer();
    try { await scribe.disconnect(); } catch { /* ignore */ }
    const transcript = `${scribeFinalRef.current} ${scribePartialRef.current}`.trim();
    scribeFinalRef.current = "";
    scribePartialRef.current = "";
    if (transcript) {
      setStatus("processing");
      processTranscript(transcript).finally(() => setLiveTranscript(""));
    } else {
      console.warn("[Scribe] finish with empty transcript");
      setLiveTranscript("");
      setStatus("idle");
      onErrorRef.current?.("Aucun texte détecté, réessayez.");
    }
  }, [scribe, processTranscript, clearSilenceTimer, clearMaxDurationTimer]);

  useEffect(() => { finishScribeRef.current = finishScribeRecording; }, [finishScribeRecording]);

  // iOS PWA: when the app goes to background, AudioContext + WebSocket get suspended
  // and the recording silently breaks. Auto-finish to avoid a stuck "recording" state.
  useEffect(() => {
    if (!useScribePath) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && status === "recording") {
        console.log("[Scribe] visibility hidden during recording -> auto-finish");
        finishScribeRef.current();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [useScribePath, status]);

  // ====================== Web Speech API path (default) ======================
  const startRecording = useCallback(() => {
    // Prime l'AudioContext du beep dans le geste utilisateur
    ensureBeepContext();
    if (useScribePath) {

      try {
        pendingScribeStreamRef.current?.getTracks().forEach((track) => track.stop());
        pendingScribeStreamRef.current = null;
        if (pendingScribeAudioContextRef.current && pendingScribeAudioContextRef.current.state !== "closed") {
          void pendingScribeAudioContextRef.current.close();
        }
        pendingScribeAudioContextRef.current = null;

        scribeFinalRef.current = "";
        scribePartialRef.current = "";
        setLiveTranscript("");
        setStatus("recording");
        // micReady reste false jusqu'à la fin du warm-up (voir startScribeRecording).
        setMicReady(false);

        const audioContext = new AudioContext();
        void audioContext.resume();
        const streamPromise = navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        });
        streamPromise
          .then((stream) => {
            pendingScribeStreamRef.current = stream;
            pendingScribeAudioContextRef.current = audioContext;
            void startScribeRecording();
          })
          .catch((e) => {
            if (audioContext.state !== "closed") void audioContext.close();
            console.error("[Scribe] getUserMedia failed:", e);
            const msg = e instanceof Error ? e.message : String(e);
            if (/permission|denied|NotAllowed/i.test(msg)) {
              onErrorRef.current?.("Microphone bloqué. Autorisez le micro dans les réglages Safari.");
            } else {
              onErrorRef.current?.(`Erreur vocale: ${msg}`);
            }
            setStatus("idle");
          });
      } catch (e) {
        console.error("[Scribe] microphone init failed:", e);
        const msg = e instanceof Error ? e.message : String(e);
        onErrorRef.current?.(`Erreur vocale: ${msg}`);
        setStatus("idle");
        return;
      }
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setStatus("idle");
      onErrorRef.current?.("Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome ou Edge.");
      return;
    }

    accumulatedTranscriptRef.current = "";
    setLiveTranscript("");
    clearSilenceTimer();
    // Indicate immediately we're starting so UI shows feedback during warm-up
    setStatus("recording");
    // On attend toujours l'événement onstart avant d'inviter à parler :
    // c'est lui qui déclenche le beep de signal sonore (synthétisé sur desktop/iOS,
    // natif sur Android). Tant qu'il n'est pas reçu, on affiche "Attendez le signal sonore".
    setMicReady(false);

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.interimResults = true;
    // Sur Android, continuous=true ne marque jamais isFinal → on force false :
    // le moteur émet alors des résultats finaux propres dès la fin de phrase.
    recognition.continuous = !isAndroid();
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("recording");
      setLiveTranscript("");
      // Jouer le bip d'abord, puis basculer "Attendez…" → "Parlez maintenant"
      // après un court délai. Sur Samsung/Android le bip natif est légèrement
      // retardé : sans délai, le texte change avant que l'utilisateur entende
      // le signal, ce qui donne l'impression d'un ordre inversé.
      playReadyBeep();
      setTimeout(() => setMicReady(true), 450);
    };


    recognition.onresult = (event) => {
      // Android Chrome emits multiple distinct non-final result entries that
      // never get marked final until silence. Concatenating them all produces
      // duplicated text ("je veux je veux faire faire un tennis…"). We only
      // keep finals as the accumulated text and the LAST non-final as interim.
      let finalTranscript = "";
      let lastInterim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += text + " ";
        } else {
          lastInterim = text;
        }
      }

      setLiveTranscript((finalTranscript + lastInterim).trim());

      // Persist both finals and the latest interim so silence-timer auto-finish
      // doesn't lose the segment when nothing is ever marked final (Android).
      const merged = (finalTranscript + lastInterim).trim();
      if (merged) {
        accumulatedTranscriptRef.current = merged;
      }

      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        }
        const transcript = accumulatedTranscriptRef.current;
        accumulatedTranscriptRef.current = "";
        processTranscript(transcript);
      }, isAndroid() ? SILENCE_DELAY_MS_ANDROID : SILENCE_DELAY_MS);
    };

    recognition.onerror = (event) => {
      console.error("[VoiceSearch] onerror:", event.error, "| inIframe:", window.self !== window.top, "| secure:", window.isSecureContext);
      if (recognitionRef.current === null || accumulatedTranscriptRef.current) {
        clearSilenceTimer();
        recognitionRef.current = null;
        return;
      }
      clearSilenceTimer();
      recognitionRef.current = null;
      accumulatedTranscriptRef.current = "";
      const isInIframe = window.self !== window.top;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        if (isInIframe) {
          onErrorRef.current?.(
            "La recherche vocale ne fonctionne pas dans la prévisualisation. Testez sur le site publié."
          );
        } else {
          onErrorRef.current?.(
            "Microphone bloqué. Cliquez sur 🔒 dans la barre d'adresse → Autoriser le micro, puis rechargez la page."
          );
        }
      } else if (event.error === "no-speech" || event.error === "aborted") {
        setStatus("idle");
        return;
      } else {
        onErrorRef.current?.(`Erreur vocale: ${event.error}`);
      }
      setStatus("idle");
    };

    recognition.onend = async () => {
      if (recognitionRef.current !== null) {
        recognitionRef.current = null;
      }
      clearSilenceTimer();
      const transcript = accumulatedTranscriptRef.current;
      accumulatedTranscriptRef.current = "";

      // Android fallback : si Web Speech n'a rien rendu, on transcrit l'audio
      // côté serveur (beaucoup plus fiable que le STT natif Android).
      const fallbackBlob = await stopFallbackRecorderAndGetBlob();
      if (transcript) {
        processTranscript(transcript);
      } else if (fallbackBlob) {
        console.log("[VoiceSearch] empty native transcript → server fallback");
        setStatus("processing");
        const serverText = await transcribeFallbackBlob(fallbackBlob);
        if (serverText) {
          // Affiche le texte dans l'overlay (Web Speech n'a rien émis sur Android).
          setLiveTranscript(serverText);
          processTranscript(serverText).finally(() => setLiveTranscript(""));
        } else {
          setStatus("idle");
          onErrorRef.current?.("Aucun texte détecté, réessayez.");
        }
      } else if (status === "recording") {
        setStatus("idle");
      }
    };


    recognitionRef.current = recognition;

    // Warm-up the mic pipeline (AGC / noise suppression) BEFORE starting
    // recognition. Without this, the first ~500-800 ms of audio on a fresh
    // session are noisy/under-leveled and the first words get mangled
    // (especially proper nouns). We open a temporary stream, hold it for
    // MIC_WARMUP_MS, then close it and start SpeechRecognition — which then
    // opens its own stream against an already-calibrated audio path.
    const startNow = () => {
      try {
        recognition.start();
      } catch (e) {
        console.error("[VoiceSearch] recognition.start failed:", e);
        recognitionRef.current = null;
        setStatus("idle");
        onErrorRef.current?.("Erreur vocale: démarrage impossible.");
      }
    };

    // Android Chrome silently fails when SpeechRecognition.start() runs after
    // an async gap (getUserMedia + setTimeout) — the browser loses the user
    // gesture context. On Android we MUST start synchronously inside the
    // click handler. Skip the warm-up entirely on Android.
    if (isAndroid()) {
      startNow();
      // Lance le recorder de fallback en parallèle (non bloquant, async OK).
      void startFallbackRecorder();
      return;
    }


    navigator.mediaDevices
      ?.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } })
      .then((stream) => {
        setTimeout(() => {
          stream.getTracks().forEach((t) => t.stop());
          startNow();
        }, MIC_WARMUP_MS);
      })
      .catch(() => {
        // No permission / not supported: fall back to direct start
        startNow();
      });
  }, [lang, clearSilenceTimer, processTranscript, status, useScribePath, startScribeRecording, startFallbackRecorder, stopFallbackRecorderAndGetBlob, transcribeFallbackBlob, ensureBeepContext, playReadyBeep]);

  const stopRecording = useCallback(() => {
    if (useScribePath) {
      void stopScribeRecording();
      return;
    }
    clearSilenceTimer();
    accumulatedTranscriptRef.current = "";
    setLiveTranscript("");
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    // Stop le fallback recorder Android sans utiliser le blob.
    void stopFallbackRecorderAndGetBlob();
    setStatus("idle");
  }, [clearSilenceTimer, useScribePath, stopScribeRecording, stopFallbackRecorderAndGetBlob]);

  const finishRecording = useCallback(async () => {
    if (useScribePath) {
      void finishScribeRecording();
      return;
    }
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    const transcript = accumulatedTranscriptRef.current;
    accumulatedTranscriptRef.current = "";
    const fallbackBlob = await stopFallbackRecorderAndGetBlob();
    if (transcript) {
      setStatus("processing");
      processTranscript(transcript).finally(() => setLiveTranscript(""));
    } else if (fallbackBlob) {
      console.log("[VoiceSearch] finish with empty native transcript → server fallback");
      setStatus("processing");
      const serverText = await transcribeFallbackBlob(fallbackBlob);
      if (serverText) {
        // Affiche le texte dans l'overlay (Web Speech n'a rien émis sur Android).
        setLiveTranscript(serverText);
        processTranscript(serverText).finally(() => setLiveTranscript(""));
      } else {
        setLiveTranscript("");
        setStatus("idle");
        onErrorRef.current?.("Aucun texte détecté, réessayez.");
      }
    } else {
      setLiveTranscript("");
      setStatus("idle");
    }
  }, [clearSilenceTimer, processTranscript, useScribePath, finishScribeRecording, stopFallbackRecorderAndGetBlob, transcribeFallbackBlob]);

  const toggleRecording = useCallback(() => {
    if (status === "recording") {
      stopRecording();
    } else if (status === "idle" || status === "error") {
      startRecording();
    }
  }, [status, startRecording, stopRecording]);

  // Démarre/arrête le VU-mètre automatiquement selon le statut.
  useEffect(() => {
    if (status === "recording") {
      void startAudioLevelMonitor();
    } else {
      stopAudioLevelMonitor();
    }
  }, [status, startAudioLevelMonitor, stopAudioLevelMonitor]);

  // Réinitialise l'état "micro prêt" dès qu'on quitte l'enregistrement.
  useEffect(() => {
    if (status !== "recording") setMicReady(false);
  }, [status]);

  return { status, toggleRecording, finishRecording, liveTranscript, audioLevel, micReady };
}
