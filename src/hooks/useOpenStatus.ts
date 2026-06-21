import { useMemo } from "react";
import { isCurrentlyOpen, getMoroccoNow } from "@/lib/formatOpeningHours";

interface UseOpenStatusParams {
  business: any;
  language: string;
}

export function useOpenStatus({ business, language }: UseOpenStatusParams) {
  return useMemo(() => {
    if (!business) return { text: null, isOpen: false };
    const canShow = !!business.show_opening_hours || !!business.is_open_24h;
    if (!canShow) return { text: null, isOpen: false };

    if (business.is_open_24h) {
      const label = language === "en" ? "Open 24/7" : language === "ar" ? "مفتوح 24/24" : "Ouvert 24h/24";
      return { text: label, isOpen: true };
    }

    const frToEn: Record<string, string> = {
      lundi: "monday", mardi: "tuesday", mercredi: "wednesday", jeudi: "thursday",
      vendredi: "friday", samedi: "saturday", dimanche: "sunday",
    };
    const rawHours = business.opening_hours as Record<string, { open?: string; close?: string; open2?: string; close2?: string; closed?: boolean; continuous?: boolean }> | null;
    if (!rawHours) return { text: null, isOpen: false };
    const hours = Object.entries(rawHours).reduce((acc, [k, v]) => {
      acc[frToEn[k] || k] = v;
      return acc;
    }, {} as Record<string, any>);

    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const now = new Date();
    const todayKey = days[now.getDay()];
    const currentlyOpen = isCurrentlyOpen(todayKey ? hours[todayKey] : null);

    if (currentlyOpen) {
      const label = language === "en" ? "Open" : language === "ar" ? "مفتوح" : "Ouvert";
      return { text: label, isOpen: true };
    }

    const nowMin = now.getHours() * 60 + now.getMinutes();
    const dh = hours[todayKey];
    let foundToday = false;
    let badgeText: string | null = null;

    if (dh && !dh.closed && dh.open) {
      const [oh, om] = dh.open.split(":").map(Number);
      const openMin = oh * 60 + (om || 0);
      if (openMin > nowMin) {
        const prefix = language === "en" ? "Opens at" : language === "ar" ? "يفتح في" : "Ouvre à";
        badgeText = `${prefix} ${dh.open}`;
        foundToday = true;
      } else if (dh.open2 && dh.close2 && !dh.continuous) {
        const [oh2, om2] = dh.open2.split(":").map(Number);
        const open2Min = oh2 * 60 + (om2 || 0);
        if (open2Min > nowMin) {
          const prefix = language === "en" ? "Opens at" : language === "ar" ? "يفتح في" : "Ouvre à";
          badgeText = `${prefix} ${dh.open2}`;
          foundToday = true;
        }
      }
    }

    if (!foundToday) {
      const dayLabels = language === "en"
        ? ["Sun.", "Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat."]
        : language === "ar"
          ? ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
          : ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
      for (let i = 1; i <= 7; i++) {
        const idx = (now.getDay() + i) % 7;
        const nextDh = hours[days[idx]];
        if (nextDh && !nextDh.closed && nextDh.open) {
          const prefix = language === "en" ? "Opens" : language === "ar" ? "يفتح" : "Ouvre";
          badgeText = `${prefix} ${dayLabels[idx]} ${language === "ar" ? "" : "à "}${nextDh.open}`;
          break;
        }
      }
    }

    if (badgeText) return { text: badgeText, isOpen: false };

    const closedLabel = language === "en" ? "Closed" : language === "ar" ? "مغلق" : "Fermé";
    return { text: closedLabel, isOpen: false };
  }, [business, language]);
}
