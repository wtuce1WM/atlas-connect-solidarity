import logoGold from "@/assets/logoGOLDsimple.webp";

interface LogoCSSSpinnerProps {
  className?: string;
}

/**
 * Pure CSS 3D coin-flip spinner — replaces the Three.js Logo3DSpinner.
 * Single rotation on mount, then subtle floating idle animation.
 * ~0 KB extra bundle (no three.js dependency).
 */
const LogoCSSSpinner = ({ className = "w-64 h-64" }: LogoCSSSpinnerProps) => {
  return (
    <div className={`${className} [perspective:800px] flex items-center justify-center`}>
      <div
        className="w-full h-full animate-[coinSpin_1.2s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        style={{ transformStyle: "preserve-3d" }}
      >
        <img
          src={logoGold}
          alt=""
          className="w-full h-full object-contain drop-shadow-[0_0_30px_hsla(43,75%,55%,0.4)] animate-[coinFloat_4s_ease-in-out_1.2s_infinite]"
          style={{ backfaceVisibility: "hidden" }}
        />
      </div>
    </div>
  );
};

export default LogoCSSSpinner;
