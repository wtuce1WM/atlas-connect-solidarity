interface LoadingScreenProps {
  /** When true, triggers the fade-out exit animation */
  exiting?: boolean;
  /** Called when the exit animation completes */
  onExited?: () => void;
}

const LoadingScreen = ({ onExited }: LoadingScreenProps) => {
  onExited?.();
  return null;
};

export default LoadingScreen;
