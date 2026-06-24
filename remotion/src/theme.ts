import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";

export const { fontFamily: serif } = loadCormorant("normal", {
  weights: ["300", "400", "500", "600"],
  subsets: ["latin"],
});
export const { fontFamily: sans } = loadMontserrat("normal", {
  weights: ["300", "400", "500", "700"],
  subsets: ["latin"],
});

export const COLORS = {
  night: "#0E0B08",
  ink: "#1A130D",
  terracotta: "#C04F17",
  gold: "#D4AF37",
  cream: "#F2E6D2",
  bone: "#E8D9BE",
};
