import { useState, useRef, useCallback } from "react";

type VoiceStatus = "idle" | "recording" | "processing" | "error";

interface UseVoiceSearchOptions {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  lang?: string;
}

// Extend Window to include webkitSpeechRecognition
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

// French + Arabic + English stopwords to strip from voice queries
const FR_STOPWORDS = new Set([
  "trouve", "trouver", "cherche", "chercher", "recherche", "rechercher",
  "montrer", "montre", "affiche", "afficher", "je", "veux", "voudrais",
  "besoin", "un", "une", "des", "le", "la", "les", "de", "du", "d",
  "en", "a", "au", "aux", "et", "ou", "sur", "pour", "par",
  "avec", "dans", "me", "mon", "ma", "mes", "qui", "que", "quoi",
  "est", "il", "elle", "ils", "elles", "near", "pres",
  "bonne", "bon", "bien", "meilleur", "meilleurs", "meilleures",
  // Phrases de service (ex: "hôtel qui accepte les animaux de compagnie")
  "accepte", "acceptent", "acceptes", "acceptes", "acceptant",
  "compagnie", "animaux de compagnie",
  "qui", "que", "dont", "lequel", "laquelle",
]);

function extractSearchKeywords(transcript: string): string {
  const normalized = transcript
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents for comparison
    .replace(/[^\w\s]/g, " ")
    .trim();

  const words = normalized.split(/\s+/).filter((w) => w.length > 1 && !FR_STOPWORDS.has(w));

  // Reconstruct with original casing (keep original words for the search engine)
  const originalWords = transcript
    .replace(/[^\w\s\u00C0-\u024F\u0600-\u06FF]/g, " ")
    .trim()
    .split(/\s+/);

  const kept = originalWords.filter((w) => {
    const norm = w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return w.length > 1 && !FR_STOPWORDS.has(norm);
  });

  return kept.join(" ").trim() || transcript.trim();
}

export function useVoiceSearch({ onTranscript, onError, lang = "fr-FR" }: UseVoiceSearchOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startRecording = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setStatus("error");
      onError?.("Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome ou Edge.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("recording");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        const keywords = extractSearchKeywords(transcript);
        onTranscript(keywords);
      } else {
        onError?.("Aucun texte détecté, réessayez.");
      }
      setStatus("idle");
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        onError?.("Accès au microphone refusé.");
      } else if (event.error === "no-speech") {
        onError?.("Aucune parole détectée, réessayez.");
      } else {
        onError?.("Erreur de reconnaissance vocale.");
      }
      setStatus("error");
    };

    recognition.onend = () => {
      if (status === "recording") {
        setStatus("idle");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript, onError, lang, status]);

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
