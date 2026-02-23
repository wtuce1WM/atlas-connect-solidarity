import logoGold from "@/assets/logoGOLDsimple.webp";

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black">
      <img
        src={logoGold}
        alt="Loading"
        className="w-64 h-64 object-contain animate-logo-zoom"
      />
    </div>
  );
};

export default LoadingScreen;
