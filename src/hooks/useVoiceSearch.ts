import { useState, useRef, useCallback, useEffect } from "react";

type VoiceStatus = "idle" | "recording" | "processing" | "error";

interface UseVoiceSearchOptions {
  onTranscript: (keywords: string, spokenText: string, category?: string) => void;
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

async function extractSearchIntent(transcript: string): Promise<{ query: string; category: string }> {
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
    };
  } catch (err) {
    console.warn("LLM intent extraction failed, using raw transcript:", err);
    return { query: transcript, category: "" };
  }
}

const SILENCE_DELAY_MS = 2000;

export function useVoiceSearch({ onTranscript, onError, lang = "fr-FR" }: UseVoiceSearchOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTranscriptRef = useRef<string>("");

  // Garder les callbacks en ref pour éviter les problèmes de closure dans les handlers async
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
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
    const { query: keywords, category } = await extractSearchIntent(transcript);
    setStatus("idle");
    if (keywords) {
      onTranscriptRef.current(keywords, transcript, category || undefined);
    } else {
      onErrorRef.current?.("Aucun texte détecté, réessayez.");
    }
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setStatus("idle");
      onErrorRef.current?.("Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome ou Edge.");
      return;
    }

    accumulatedTranscriptRef.current = "";
    clearSilenceTimer();

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("recording");
    };

    recognition.onresult = (event) => {
      // Accumuler uniquement les résultats finaux
      let finalTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }

      if (finalTranscript.trim()) {
        accumulatedTranscriptRef.current = finalTranscript.trim();
      }

      // Réinitialiser le timer de silence à chaque nouveau résultat
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        // 2 secondes de silence → arrêter et traiter
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
      console.error("Speech recognition error:", event.error);
      clearSilenceTimer();
      recognitionRef.current = null;
      accumulatedTranscriptRef.current = "";
      if (event.error === "not-allowed") {
        onErrorRef.current?.("Accès au microphone refusé.");
      } else if (event.error === "no-speech") {
        onErrorRef.current?.("Aucune parole détectée, réessayez.");
      } else {
        onErrorRef.current?.("Erreur de reconnaissance vocale.");
      }
      setStatus("idle");
    };

    recognition.onend = () => {
      // Si onend arrive sans que le timer ait déclenché (fin naturelle), on traite
      if (recognitionRef.current !== null) {
        recognitionRef.current = null;
      }
      // Si un transcript accumulé existe et que le timer n'a pas encore déclenché, on traite immédiatement
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
  }, [lang, clearSilenceTimer, processTranscript, status]);

  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    accumulatedTranscriptRef.current = "";
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setStatus("idle");
  }, [clearSilenceTimer]);

  const toggleRecording = useCallback(() => {
    if (status === "recording") {
      stopRecording();
    } else if (status === "idle" || status === "error") {
      startRecording();
    }
  }, [status, startRecording, stopRecording]);

  return { status, toggleRecording };
}
