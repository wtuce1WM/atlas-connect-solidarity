import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadNunito } from "@remotion/google-fonts/NunitoSans";

// Headings / display → Montserrat (brand)
export const { fontFamily: display } = loadMontserrat("normal", {
  weights: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});
// Body → Nunito Sans (fallback for Avenir, per brand guidelines)
export const { fontFamily: body } = loadNunito("normal", {
  weights: ["300", "400", "600", "700"],
  subsets: ["latin"],
});

// Backward-compat aliases (existing scenes reference `serif` / `sans`)
export const serif = display;
export const sans = body;

export const COLORS = {
  night: "#0E0B08",
  ink: "#1A130D",
  terracotta: "#C04F17",
  gold: "#D4AF37",
  cream: "#F2E6D2",
  bone: "#E8D9BE",
};
