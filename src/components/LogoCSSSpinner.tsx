import { useState } from "react";
import logoGold from "@/assets/logoGOLDsimple.webp";

interface LogoCSSSpinnerProps {
  className?: string;
  replayKey?: number;
}

const LogoCSSSpinner = ({ className = "w-64 h-64", replayKey }: LogoCSSSpinnerProps) => {
  const [localKey, setLocalKey] = useState(0);
  const key = replayKey ?? localKey;

  return (
    <div className={`${className} [perspective:800px] flex flex-col items-center justify-center gap-2`}>
      <img
        key={key}
        src={logoGold}
        alt=""
        className="w-full h-full object-contain drop-shadow-[0_0_30px_hsla(43,75%,55%,0.4)] animate-[coinSpin_1.2s_cubic-bezier(0.16,1,0.3,1)_forwards]"
      />
      {replayKey === undefined && (
        <button
          onClick={() => setLocalKey(k => k + 1)}
          className="text-xs text-gold/70 hover:text-gold transition-colors"
        >
          ▶ Rejouer
        </button>
      )}
    </div>
  );
};

export default LogoCSSSpinner;
