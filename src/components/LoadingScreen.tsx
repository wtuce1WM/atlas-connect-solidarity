import Logo3DSpinner from "@/components/Logo3DSpinner";

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black">
      <Logo3DSpinner className="w-48 h-48" />
    </div>
  );
};

export default LoadingScreen;
