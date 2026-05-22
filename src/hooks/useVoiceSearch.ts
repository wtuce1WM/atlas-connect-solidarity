import { useState, useRef, useCallback, useEffect } from "react";
import { useScribe } from "@elevenlabs/react";

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

// Detect iOS (iPhone/iPad/iPod, including iPadOS reporting as Mac with touch)
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSClassic = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = ua.includes("Mac") && typeof document !== "undefined" && "ontouchend" in document;
  return iOSClassic || iPadOS;
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

export function useVoiceSearch({ onTranscript, onHotelAvailability, onHotelSearch, onFlightSearch, onWebSearch, onError, lang = "fr-FR" }: UseVoiceSearchOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTranscriptRef = useRef<string>("");

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

  const processTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      setStatus("idle");
      onErrorRef.current?.("Aucun texte détecté, réessayez.");
      return;
    }
    setStatus("processing");
    const { query: keywords, category, timeKeyword, intent, hotelAvailability, hotelSearch, flightSearch, webSearch } = await extractSearchIntent(transcript);
    setStatus("idle");

    if (intent === "hotelAvailability" && hotelAvailability && onHotelAvailabilityRef.current) {
      onHotelAvailabilityRef.current(hotelAvailability, transcript);
    } else if (intent === "hotelSearch" && hotelSearch && onHotelSearchRef.current) {
      onHotelSearchRef.current(hotelSearch, transcript);
    } else if (intent === "flightSearch" && flightSearch && onFlightSearchRef.current) {
      onFlightSearchRef.current(flightSearch, transcript);
    } else if (intent === "webSearch" && webSearch && onWebSearchRef.current) {
      onWebSearchRef.current(webSearch, transcript);
    } else if (keywords) {
      onTranscriptRef.current(keywords, transcript, category || undefined, timeKeyword || undefined);
    } else {
      onErrorRef.current?.("Aucun texte détecté, réessayez.");
    }
  }, []);

  // ====================== ElevenLabs Scribe (iOS only) ======================
  // On iOS, the native Web Speech API uses Siri's local dictation which is
  // very poor in French and on proper nouns. We use ElevenLabs Scribe realtime
  // instead, which gives desktop-grade quality.
  const useScribePath = isIOS();
  const scribeFinalRef = useRef<string>("");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: "vad",
    onPartialTranscript: (data: { text: string }) => {
      setLiveTranscript((scribeFinalRef.current + " " + (data.text || "")).trim());
    },
    onCommittedTranscript: (data: { text: string }) => {
      scribeFinalRef.current = (scribeFinalRef.current + " " + (data.text || "")).trim();
      setLiveTranscript(scribeFinalRef.current);
    },
  });

  const startScribeRecording = useCallback(async () => {
    try {
      scribeFinalRef.current = "";
      setLiveTranscript("");
      setStatus("recording");

      await navigator.mediaDevices.getUserMedia({ audio: true });

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

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (e) {
      console.error("[Scribe] start failed:", e);
      setStatus("idle");
      const msg = e instanceof Error ? e.message : String(e);
      if (/permission|denied|NotAllowed/i.test(msg)) {
        onErrorRef.current?.("Microphone bloqué. Autorisez le micro dans les réglages Safari.");
      } else {
        onErrorRef.current?.(`Erreur vocale: ${msg}`);
      }
    }
  }, [scribe]);

  const stopScribeRecording = useCallback(async () => {
    try { await scribe.disconnect(); } catch { /* ignore */ }
    scribeFinalRef.current = "";
    setLiveTranscript("");
    setStatus("idle");
  }, [scribe]);

  const finishScribeRecording = useCallback(async () => {
    try { await scribe.disconnect(); } catch { /* ignore */ }
    const transcript = scribeFinalRef.current.trim();
    scribeFinalRef.current = "";
    if (transcript) {
      setStatus("processing");
      processTranscript(transcript).finally(() => setLiveTranscript(""));
    } else {
      setLiveTranscript("");
      setStatus("idle");
    }
  }, [scribe, processTranscript]);

  // ====================== Web Speech API path (default) ======================
  const startRecording = useCallback(() => {
    if (useScribePath) {
      void startScribeRecording();
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

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("recording");
      setLiveTranscript("");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      setLiveTranscript((finalTranscript + interimTranscript).trim());

      if (finalTranscript.trim()) {
        accumulatedTranscriptRef.current = finalTranscript.trim();
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
      }, SILENCE_DELAY_MS);
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

    recognition.onend = () => {
      if (recognitionRef.current !== null) {
        recognitionRef.current = null;
      }
      clearSilenceTimer();
      const transcript = accumulatedTranscriptRef.current;
      accumulatedTranscriptRef.current = "";
      if (transcript) {
        processTranscript(transcript);
      } else if (status === "recording") {
        setStatus("idle");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, clearSilenceTimer, processTranscript, status, useScribePath, startScribeRecording]);

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
    setStatus("idle");
  }, [clearSilenceTimer, useScribePath, stopScribeRecording]);

  const finishRecording = useCallback(() => {
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
    if (transcript) {
      setStatus("processing");
      processTranscript(transcript).finally(() => {
        setLiveTranscript("");
      });
    } else {
      setLiveTranscript("");
      setStatus("idle");
    }
  }, [clearSilenceTimer, processTranscript, useScribePath, finishScribeRecording]);

  const toggleRecording = useCallback(() => {
    if (status === "recording") {
      stopRecording();
    } else if (status === "idle" || status === "error") {
      startRecording();
    }
  }, [status, startRecording, stopRecording]);

  return { status, toggleRecording, finishRecording, liveTranscript };
}
