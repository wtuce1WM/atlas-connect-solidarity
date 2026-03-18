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
            filter: "drop-shadow(0 0 12px hsla(43,75%,55%,0.4))",
            animation: "coinSpin 1.2s cubic-bezier(0.16,1,0.3,1) forwards, logoPulseGlow 2.5s ease-in-out 1.2s infinite",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none rounded-full overflow-hidden"
          style={{
            animation: "coinSpin 1.2s cubic-bezier(0.16,1,0.3,1) forwards",
            maskImage: "radial-gradient(circle, black 45%, transparent 55%)",
            WebkitMaskImage: "radial-gradient(circle, black 45%, transparent 55%)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(105deg, transparent 30%, hsla(43,80%,75%,0.45) 45%, hsla(0,0%,100%,0.5) 50%, hsla(43,80%,75%,0.45) 55%, transparent 70%)",
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
