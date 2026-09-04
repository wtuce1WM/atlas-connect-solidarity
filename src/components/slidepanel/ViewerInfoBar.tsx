import React from "react";

/**
 * Enveloppe visuelle UNIQUE de la « Barre info viewer ».
 *
 * Source de vérité partagée par les deux parcours :
 *  - `VideoSlidePanel` (feed vidéo)
 *  - `BookOnlineSlidePanel` (via `CtaBar` → `infoSlot`)
 *
 * Le fond se prolonge derrière le cluster CTA (Play/Mute/IA/Lieu/Profil) sans
 * ajouter de hauteur visible : le padding bas est compensé par une marge
 * négative de même valeur. Toute divergence d'affichage entre les deux panneaux
 * doit être corrigée ICI, jamais dans un seul appelant.
 */
const ViewerInfoBar = ({ children }: { children: React.ReactNode }) => (
  <div className="relative w-[calc(100%-0.25rem)] max-w-[480px] mx-auto md:w-[calc(100%-1rem)] md:max-w-[450px] rounded-t-2xl border-x border-b-0 border-white/10 bg-gradient-to-b from-black/55 to-black/85 backdrop-blur-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.45)] pointer-events-auto pb-[calc(96px+env(safe-area-inset-bottom))] -mb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-[5.5rem] lg:-mb-[5.5rem]">
    {children}
  </div>
);

export default ViewerInfoBar;
