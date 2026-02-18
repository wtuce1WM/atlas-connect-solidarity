import { useState, useRef, useCallback } from "react";

type VoiceStatus = "idle" | "recording" | "processing" | "error";

interface UseVoiceSearchOptions {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
}

export function useVoiceSearch({ onTranscript, onError }: UseVoiceSearchOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });

        setStatus("processing");
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

          const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-transcribe`, {
            method: "POST",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          if (data?.text) {
            onTranscript(data.text.trim());
          } else {
            onError?.("Aucun texte détecté, réessayez.");
          }
        } catch (err) {
          console.error("Transcription error:", err);
          onError?.("Erreur lors de la transcription.");
        } finally {
          setStatus("idle");
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setStatus("recording");
    } catch (err) {
      console.error("Microphone error:", err);
      setStatus("error");
      onError?.("Accès au microphone refusé.");
    }
  }, [onTranscript, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
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
