import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        josefin: ["'Montserrat'", "sans-serif"],
        roboto: ["'Avenir Next'", "'Avenir'", "'Nunito Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Moroccan colors
        terracotta: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        majorelle: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        atlas: {
          DEFAULT: "hsl(var(--atlas-green))",
          foreground: "hsl(var(--atlas-green-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        whatsapp: {
          DEFAULT: "hsl(var(--whatsapp))",
          foreground: "hsl(var(--whatsapp-foreground))",
        },
        "map-surface": {
          DEFAULT: "hsl(var(--map-surface))",
          foreground: "hsl(var(--map-surface-foreground))",
        },
        "searchbar-surface": "hsl(var(--searchbar-surface))",

        "wtuce-blue": {
          DEFAULT: "hsl(var(--wtuce-blue))",
          foreground: "hsl(var(--wtuce-blue-foreground))",
        },
        "morocco-red": {
          DEFAULT: "hsl(var(--morocco-red))",
        },
        "morocco-green": {
          DEFAULT: "hsl(var(--morocco-green))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "slide-down-from-top": {
          "0%": { transform: "translateY(-100%) translateX(0)", opacity: "0" },
          "100%": { transform: "translateY(0) translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-up-from-bottom": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ripple": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "zoom-out-center": {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "heart-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.4)" },
          "100%": { transform: "scale(1)" },
        },
        "heart-color-pulse": {
          "0%": { color: "#000000", transform: "scale(1)" },
          "30%": { color: "#ef4444", transform: "scale(1.35)" },
          "60%": { color: "#6050DC", transform: "scale(1.15)" },
          "100%": { color: "#000000", transform: "scale(1)" },
        },
        "heart-bg-pulse": {
          "0%": { backgroundColor: "#F1F1F1" },
          "30%": { backgroundColor: "#FF1A1A" },
          "60%": { backgroundColor: "#FF1A1A" },
          "100%": { backgroundColor: "#F1F1F1" },
        },
        "heart-fly": {
          "0%": { transform: "translate(0,0) scale(1)", opacity: "1" },
          "100%": { transform: "translate(0,-40px) scale(1.8)", opacity: "0" },
        },

        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "count-pop": {
          "0%": { transform: "scale(1.45)", opacity: "0.6" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "pin-pulse": {
          "0%": { transform: "scale(0.75)", opacity: "0.7" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 40px -10px hsl(43 75% 55% / 0.45)" },
          "50%": { boxShadow: "0 0 70px -5px hsl(43 75% 55% / 0.75)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-down-from-top": "slide-down-from-top 0.5s ease-out",
        "slide-in-left": "slide-in-left 0.35s ease-out",
        "slide-up-from-bottom": "slide-up-from-bottom 0.4s ease-out",
        "slide-in-right": "slide-in-right 0.35s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "ripple": "ripple 2.4s ease-out infinite",
        "zoom-out-center": "zoom-out-center 0.35s cubic-bezier(0.16,1,0.3,1)",
        "shimmer": "shimmer 3.5s ease-in-out infinite",
        "float": "float 5s ease-in-out infinite",
        "count-pop": "count-pop 0.6s cubic-bezier(0.16,1,0.3,1)",
        "pin-pulse": "pin-pulse 2.2s ease-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
