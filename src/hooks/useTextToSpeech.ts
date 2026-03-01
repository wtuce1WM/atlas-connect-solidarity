import { useState, useRef, useCallback } from "react";

type TTSStatus = "idle" | "loading" | "playing" | "error";

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

export function useTextToSpeech() {
  const [status, setStatus] = useState<TTSStatus>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setStatus("idle");
  }, []);

  const speak = useCallback(async (text: string, voiceId?: string) => {
    // If already playing, stop
    if (status === "playing" || status === "loading") {
      stop();
      return;
    }

    if (!text.trim()) return;

    const normalizedText = normalizeTTSText(text);

    setStatus("loading");

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ text: normalizedText, voiceId }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      objectUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setStatus("idle");
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        audioRef.current = null;
      };

      audio.onerror = () => {
        setStatus("error");
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        audioRef.current = null;
      };

      await audio.play();
      setStatus("playing");
    } catch (error) {
      console.error("TTS error:", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [status, stop]);

  return { speak, stop, status };
}
