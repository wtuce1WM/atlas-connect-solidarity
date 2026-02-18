import { useState, useRef, useCallback } from "react";
import { Menu, X, Search, Mic, MicOff, Loader } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";
import logoGold from "@/assets/logoGOLDsimpleSML.webp";

interface HeaderProps {
  variant?: "default" | "morocco" | "city";
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type VoiceStatus = "idle" | "recording" | "processing" | "error";

async function transcribeWithElevenLabs(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");

  const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-transcribe`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) throw new Error(`Transcription error: ${response.status}`);
  const data = await response.json();
  return data.text || "";
}

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
  } catch {
    return transcript;
  }
}

const Header = ({ variant = "default" }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const headerBg = variant === "morocco"
    ? "bg-gradient-to-b from-morocco-red to-morocco-red/80 backdrop-blur-sm"
    : variant === "city"
      ? "bg-transparent"
      : "bg-black backdrop-blur-md";

  const textColor = variant === "city" ? "text-black" : "text-white";
  const logoSecondary = variant === "city" ? "text-black" : "text-white";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setVoiceStatus("processing");
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const transcript = await transcribeWithElevenLabs(blob);
          if (!transcript) {
            setVoiceStatus("error");
            setTimeout(() => setVoiceStatus("idle"), 2000);
            return;
          }
          const keywords = await extractSearchIntent(transcript);
          setSearchValue(keywords);
          setVoiceStatus("idle");
          if (keywords.trim()) navigate(`/search?q=${encodeURIComponent(keywords.trim())}`);
        } catch {
          setVoiceStatus("error");
          setTimeout(() => setVoiceStatus("idle"), 2000);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setVoiceStatus("recording");
    } catch {
      setVoiceStatus("error");
      setTimeout(() => setVoiceStatus("idle"), 2000);
    }
  }, [navigate]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const toggleVoice = useCallback(() => {
    if (voiceStatus === "recording") {
      stopRecording();
    } else if (voiceStatus === "idle" || voiceStatus === "error") {
      startRecording();
    }
  }, [voiceStatus, startRecording, stopRecording]);

  const micIcon = voiceStatus === "recording"
    ? <Mic className="h-4 w-4 text-red-400 animate-pulse" />
    : voiceStatus === "processing"
      ? <Loader className="h-4 w-4 text-gold animate-spin" />
      : <Mic className="h-4 w-4 text-white/50 hover:text-gold transition-colors" />;

  return (
    <header className={`fixed left-0 right-0 top-0 z-50 ${headerBg}`}>
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 shrink-0">
          <img src={logoGold} alt="WTUCEMA Logo" className="h-9 w-9 object-contain" />
          <span className="hidden sm:inline text-lg font-bold tracking-tight">
            <span className="text-gold">ONE WORLD</span>{" "}
            <span className={logoSecondary}>MOROCCO</span>
          </span>
        </a>

        {/* Menu Button */}
        <button className={`shrink-0 ${textColor}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="border-t border-white/10 bg-black/90 backdrop-blur-lg">
          <nav className="container mx-auto flex flex-col items-center gap-4 px-4 py-6">
            {/* Search bar */}
            <form onSubmit={handleSearch} className="w-full max-w-sm">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-white/40 pointer-events-none" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Rechercher un établissement..."
                  className="w-full bg-white/10 border border-white/20 rounded-full pl-9 pr-10 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-gold/60 focus:bg-white/15 transition-all"
                />
                <button
                  type="button"
                  onClick={toggleVoice}
                  disabled={voiceStatus === "processing"}
                  className="absolute right-2 p-1 rounded-full"
                  title="Recherche vocale"
                >
                  {micIcon}
                </button>
              </div>
            </form>
            <hr className="w-full border-white/20" />
            <Link to="/mission" className="text-white/90 transition-colors hover:text-gold">
              {t("footer.ourMission")}
            </Link>
            <Link to="/contact" className="text-white/90 transition-colors hover:text-gold">
              {t("footer.contact")}
            </Link>
            <hr className="w-full border-white/20" />
            <Link to="/devenir-affilie" className="rounded-lg bg-gold px-4 py-2 font-semibold text-gold-foreground">
              {t("nav.joinNow")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
