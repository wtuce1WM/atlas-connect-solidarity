import { useNavigate } from "react-router-dom";
import SearchInput from "@/components/SearchInput";
import VoiceSearchOverlay from "@/components/VoiceSearchOverlay";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";

interface Props {
  stepLabel: string;
  title: string;
  description: string;
}

/**
 * Étape 2 card content. Same "Micro Liquid Glass + texte" overlay as Hero
 * when the mic CTA is pressed. While listening, the description slides up
 * so the search field + CTAs sit just under the title.
 */
const Step2AssistantBlock = ({ stepLabel, title, description }: Props) => {
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

      <h3 className="mt-3 font-josefin text-2xl font-light tracking-tight md:text-4xl text-foreground">
        {title}
      </h3>

      {/* Description — slides up & fades out while voice is active to free space */}
      <div
        className="grid transition-all duration-500 ease-out"
        style={{
          gridTemplateRows: isVoiceActive ? "0fr" : "1fr",
          opacity: isVoiceActive ? 0 : 1,
          transform: isVoiceActive ? "translateY(-8px)" : "translateY(0)",
        }}
      >
        <div className="overflow-hidden">
          <p className="mt-3 md:mt-4 max-w-lg font-roboto text-sm md:text-base text-foreground/70">
            {description}
          </p>
        </div>
      </div>

      <div
        className="mt-4 w-full max-w-xl md:mt-6 transition-transform duration-500 ease-out"
        style={{ transform: isVoiceActive ? "translateY(-8px)" : "translateY(0)" }}
      >
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
      </div>

      <VoiceSearchOverlay
        isOpen={isVoiceActive}
        liveTranscript={voice.liveTranscript}
        onClose={voice.toggleRecording}
        onFinish={voice.finishRecording}
        contained
      />
    </>
  );
};

export default Step2AssistantBlock;
