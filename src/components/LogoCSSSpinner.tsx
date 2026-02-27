import logoGold from "@/assets/logoGOLDsimple.webp";

interface LogoCSSSpinnerProps {
  className?: string;
}

/**
 * Pure CSS 3D coin-flip spinner.
 * Single 360° Y-rotation on mount, then stops. No floating.
 * ~0 KB extra bundle (no three.js dependency).
 */
const LogoCSSSpinner = ({ className = "w-64 h-64" }: LogoCSSSpinnerProps) => {
  return (
    <div className={`${className} [perspective:800px] flex items-center justify-center`}>
      <img
        src={logoGold}
        alt=""
        className="w-full h-full object-contain drop-shadow-[0_0_30px_hsla(43,75%,55%,0.4)] animate-[coinSpin_1.2s_cubic-bezier(0.16,1,0.3,1)_forwards]"
      />
    </div>
  );
};

export default LogoCSSSpinner;
