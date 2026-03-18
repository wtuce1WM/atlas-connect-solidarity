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
      <div className="relative w-full h-full">
        <img
          key={key}
          src={logoGold}
          alt=""
          className="w-full h-full object-contain"
          style={{
            animation: "coinSpin 1.2s cubic-bezier(0.16,1,0.3,1) forwards",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none rounded-full overflow-hidden"
          style={{
            animation: "coinSpin 1.2s cubic-bezier(0.16,1,0.3,1) forwards",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(105deg, transparent 25%, hsla(210,10%,85%,0.4) 40%, hsla(0,0%,100%,0.6) 50%, hsla(210,10%,85%,0.4) 60%, transparent 75%)",
              animation: "shineSwipe 3s ease-in-out 1.5s infinite",
            }}
          />
        </div>
      </div>
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
