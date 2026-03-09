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

export function useTextToSpeech(options?: { onEnd?: () => void }) {
  const [status, setStatus] = useState<TTSStatus>("idle");
  const [spokenWordIndex, setSpokenWordIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const wordTimingsRef = useRef<{ start: number; end: number }[] | null>(null);
  const rafRef = useRef<number>(0);
  const onEndRef = useRef(options?.onEnd);
  onEndRef.current = options?.onEnd;

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
    // Binary search for current word
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

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      stopTracking();
      setStatus("paused");
      console.log("[TTS] Paused");
    }
  }, [stopTracking]);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused && status === "paused") {
      audioRef.current.play();
      setStatus("playing");
      if (wordTimingsRef.current) {
        rafRef.current = requestAnimationFrame(trackPlayback);
      }
      console.log("[TTS] Resumed");
    }
  }, [status, trackPlayback]);

  const stop = useCallback(() => {
    stopTracking();
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
  }, [stopTracking]);

  const speak = useCallback(
    async (text: string, voiceId?: string, withTimestamps = false) => {
      // If already playing, stop
      if (status === "playing" || status === "loading" || status === "paused") {
        stop();
        return;
      }

      if (!text.trim()) return;

      // Skip normalization when timestamps are requested for precise alignment
      const finalText = withTimestamps ? text : normalizeTTSText(text);

      setStatus("loading");
      setSpokenWordIndex(-1);
      wordTimingsRef.current = null;

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
            body: JSON.stringify({ text: finalText, voiceId, withTimestamps }),
          }
        );

        if (!response.ok) {
          throw new Error(`TTS request failed: ${response.status}`);
        }

        let audioUrl: string;

        if (withTimestamps) {
          const data = await response.json();
          if (data.alignment) {
            wordTimingsRef.current = computeWordTimings(data.alignment);
          }
          audioUrl = `data:audio/mpeg;base64,${data.audio_base64}`;
        } else {
          const audioBlob = await response.blob();
          audioUrl = URL.createObjectURL(audioBlob);
          objectUrlRef.current = audioUrl;
        }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          if (wordTimingsRef.current) {
            rafRef.current = requestAnimationFrame(trackPlayback);
          }
        };

        audio.onended = () => {
          stopTracking();
          setStatus("idle");
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }
          audioRef.current = null;
          onEndRef.current?.();
        };

        audio.onerror = () => {
          stopTracking();
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
    },
    [status, stop, trackPlayback, stopTracking]
  );

  // Voice-activated stop: listen for "stop" while TTS is playing
  const stopRecognitionRef = useRef<any>(null);

  useEffect(() => {
    if (status !== "playing" && status !== "paused") {
      // Tear down listener when not playing/paused
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
          console.log("[TTS] Voice stop/pause command detected:", text);
          pause();
          return;
        }
        if (RESUME_WORDS.some(w => text.includes(w))) {
          console.log("[TTS] Voice resume command detected:", text);
          resume();
          return;
        }
      }
    };

    recognition.onerror = (e: any) => {
      // "aborted" or "no-speech" are expected; ignore silently
      if (e.error !== "aborted" && e.error !== "no-speech") {
        console.warn("[TTS] Stop listener error:", e.error);
      }
    };

    recognition.onend = () => {
      // Restart listener if still playing (browser auto-stops after silence)
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
  }, [status, stop]);

  return { speak, stop, status, spokenWordIndex };
}
