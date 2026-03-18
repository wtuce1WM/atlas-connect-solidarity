import { useState } from "react";
import logoGold from "@/assets/logo-3d-coin-v2.webp";

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
        className="w-full h-full object-contain animate-[coinSpin_1.2s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        style={{
          filter: "drop-shadow(0 0 12px hsla(43,75%,55%,0.4))",
          animation: "coinSpin 1.2s cubic-bezier(0.16,1,0.3,1) forwards, logoPulseGlow 2.5s ease-in-out 1.2s infinite",
        }}
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
