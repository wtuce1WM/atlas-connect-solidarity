import { useNavigate } from "react-router-dom";
import { Search, Mic } from "lucide-react";
import SearchInput from "@/components/SearchInput";
import VoiceSearchPanel from "@/components/VoiceSearchPanel";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";

interface Props {
  stepLabel: string;
  title: string;
  description: string;
  onMobileSearchClick?: () => void;
}

/**
 * Étape 2 card content. Same "Micro Liquid Glass + texte" inline panel as
 * the Hero (VoiceSearchPanel) when the mic CTA is pressed. The step label
 * and title stay visible; only the description collapses to free space.
 */
const Step2AssistantBlock = ({ stepLabel, title, description, onMobileSearchClick }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const voice = useVoiceSearch({
    onTranscript: (keywords) => {
      navigate(`/search?q=${encodeURIComponent(keywords)}&tab=ai`);
    },
    onError: (message) => {
      toast({ title: "Erreur", description: message, variant: "destructive" });
    },
  });

  const isVoiceActive = voice.status === "recording" || voice.status === "processing";

  return (
    <>
      <span
        className="font-josefin text-xs uppercase tracking-[0.3em] text-white inline-flex items-center rounded-full px-3 py-1 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]"
        style={{ backgroundColor: "#C04F17" }}
      >
        {stepLabel}
      </span>

      <h3 className="mt-3 font-josefin text-2xl font-light tracking-tight md:text-4xl text-black [text-shadow:0_1px_2px_rgba(255,255,255,0.5)]">
        {title}
      </h3>

      <button
        type="button"
        onClick={() => {
          const q1 = "je cherche un restaurant à Marrakech ouvert demain midi avec une piscine";
          const q2 = "sur la route de l'Ourika";
          navigate(`/search?q=${encodeURIComponent(q1)}&tab=ai&demo=${encodeURIComponent(q2)}`);
        }}
        className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 font-roboto text-xs font-semibold text-black shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] border border-white/30 transition-transform hover:scale-[1.03] active:scale-95"
        style={{ backgroundColor: "#D4AF37" }}
      >
        <span aria-hidden>▶</span> Voir la démo
      </button>

      <p className="mt-3 md:mt-4 max-w-lg font-roboto text-sm md:text-base text-black font-bold [text-shadow:0_1px_2px_rgba(255,255,255,0.5)]">
        {description}
      </p>


      <div className="mt-4 w-full max-w-xl md:mt-6">
        {/* Desktop: inline assistant input with liquid voice panel */}
        <div className="hidden lg:block">
          <SearchInput
            variant="hero"
            placeholder="Demandez à notre assistant IA…"
            submitIcon="send"
            liquid
            showSuggestions={false}
            voiceControl={{
              status: voice.status,
              toggleRecording: voice.toggleRecording,
              liveTranscript: voice.liveTranscript,
            }}
            onSubmit={(q) => navigate(`/search?q=${encodeURIComponent(q)}&tab=ai`)}
          />

          {isVoiceActive && (
            <VoiceSearchPanel
              liveTranscript={voice.liveTranscript}
              onClose={voice.toggleRecording}
              onFinish={voice.finishRecording}
              align="start"
            />
          )}
        </div>

        {/* Mobile/Tablet: trigger fullscreen overlay */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => onMobileSearchClick?.()}
            className="w-full flex items-center gap-3 h-12 px-4 text-left text-base text-foreground/80 bg-white/15 backdrop-blur-2xl backdrop-saturate-150 border border-white/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.4)]"
          >
            <Search className="h-5 w-5 shrink-0" />
            <span className="flex-1 truncate">Demandez à notre assistant IA…</span>
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-black/80 border border-white/30">
              <Mic className="h-4 w-4 text-white" />
            </span>
          </button>
        </div>
      </div>


    </>
  );
};

export default Step2AssistantBlock;
