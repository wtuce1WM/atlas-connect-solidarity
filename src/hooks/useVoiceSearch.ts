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

async function setupScribeMicrophoneFromStream(
  stream: MediaStream,
  audioContext: AudioContext,
  onAudioData: (base64Audio: string) => void,
) {
  const [audioTrack] = stream.getAudioTracks();
  if (!audioTrack || audioTrack.readyState === "ended") throw new Error("Microphone indisponible");

  if (audioContext.state === "suspended") await audioContext.resume();

  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;

  processor.onaudioprocess = (event) => {
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

export function useVoiceSearch({ onTranscript, onHotelAvailability, onHotelSearch, onFlightSearch, onWebSearch, onError, lang = "fr-FR" }: UseVoiceSearchOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTranscriptRef = useRef<string>("");
  const pendingScribeStreamRef = useRef<MediaStream | null>(null);
  const pendingScribeAudioContextRef = useRef<AudioContext | null>(null);

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

  const finishScribeRef = useRef<() => void>(() => {});

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data: { text: string }) => {
      setLiveTranscript((scribeFinalRef.current + " " + (data.text || "")).trim());
      // Reset silence timer on any speech activity
      clearSilenceTimer();
    },
    onCommittedTranscript: (data: { text: string }) => {
      scribeFinalRef.current = (scribeFinalRef.current + " " + (data.text || "")).trim();
      setLiveTranscript(scribeFinalRef.current);
      // Auto-finish after SILENCE_DELAY_MS of no new partials/commits
      clearSilenceTimer();
      if (scribeFinalRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          finishScribeRef.current();
        }, SILENCE_DELAY_MS);
      }
    },
  });

  const startScribeRecording = useCallback(async () => {
    let mediaStream = pendingScribeStreamRef.current;
    let audioContext = pendingScribeAudioContextRef.current;
    pendingScribeStreamRef.current = null;
    pendingScribeAudioContextRef.current = null;

    try {
      scribeFinalRef.current = "";
      setLiveTranscript("");
      setStatus("recording");

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
        const result = await setupScribeMicrophoneFromStream(mediaStream, audioContext, onAudioData);
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
  }, [scribe]);

  const stopScribeRecording = useCallback(async () => {
    try { await scribe.disconnect(); } catch { /* ignore */ }
    scribeFinalRef.current = "";
    setLiveTranscript("");
    setStatus("idle");
  }, [scribe]);

  const finishScribeRecording = useCallback(async () => {
    clearSilenceTimer();
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
  }, [scribe, processTranscript, clearSilenceTimer]);

  useEffect(() => { finishScribeRef.current = finishScribeRecording; }, [finishScribeRecording]);

  // ====================== Web Speech API path (default) ======================
  const startRecording = useCallback(() => {
    if (useScribePath) {
      try {
        pendingScribeStreamRef.current?.getTracks().forEach((track) => track.stop());
        pendingScribeStreamRef.current = null;
        if (pendingScribeAudioContextRef.current && pendingScribeAudioContextRef.current.state !== "closed") {
          void pendingScribeAudioContextRef.current.close();
        }
        pendingScribeAudioContextRef.current = null;

        scribeFinalRef.current = "";
        setLiveTranscript("");
        setStatus("recording");

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
