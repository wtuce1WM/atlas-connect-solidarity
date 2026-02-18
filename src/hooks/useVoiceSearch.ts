import { useState, useRef, useCallback, useEffect } from "react";

type VoiceStatus = "idle" | "recording" | "processing" | "error";

interface UseVoiceSearchOptions {
  onTranscript: (keywords: string, spokenText: string) => void;
  onError?: (message: string) => void;
  lang?: string;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
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

async function extractSearchIntent(transcript: string): Promise<string> {
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
    return data.query?.trim() || transcript;
  } catch (err) {
    console.warn("LLM intent extraction failed, using raw transcript:", err);
    return transcript;
  }
}

export function useVoiceSearch({ onTranscript, onError, lang = "fr-FR" }: UseVoiceSearchOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Garder les callbacks en ref pour éviter les problèmes de closure dans les handlers async
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const startRecording = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setStatus("idle");
      onErrorRef.current?.("Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome ou Edge.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("recording");
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      recognitionRef.current = null;
      if (transcript) {
        setStatus("processing");
        const keywords = await extractSearchIntent(transcript);
        setStatus("idle");
        if (keywords) {
          onTranscriptRef.current(keywords, transcript);
        } else {
          onErrorRef.current?.("Aucun texte détecté, réessayez.");
        }
      } else {
        setStatus("idle");
        onErrorRef.current?.("Aucun texte détecté, réessayez.");
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      recognitionRef.current = null;
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
      // onend est toujours appelé en dernier — si onresult n'a pas mis null, on nettoie
      if (recognitionRef.current !== null) {
        recognitionRef.current = null;
        setStatus("idle");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setStatus("idle");
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (status === "recording") {
      stopRecording();
    } else if (status === "idle" || status === "error") {
      startRecording();
    }
  }, [status, startRecording, stopRecording]);

  return { status, toggleRecording };
}
