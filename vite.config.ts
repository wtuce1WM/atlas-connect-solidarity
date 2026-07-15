import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import { prerenderOgPlugin } from "./scripts/prerender-og";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    hmr: {
      protocol: "wss",
      clientPort: 443,
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Bundle analyzer — only when ANALYZE=1 is set. Generates dist/stats.html.
    process.env.ANALYZE === "1" && (visualizer({ filename: "dist/stats.html", template: "treemap", gzipSize: true, brotliSize: false }) as any),
    prerenderOgPlugin(),
    mcpPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "three", "@react-three/fiber", "@react-three/drei"],
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into separate chunks. Benefits:
        //  - parallel downloads (HTTP/2 multiplexing)
        //  - long-term caching (vendors change rarely vs app code)
        //  - Vite emits <link rel="modulepreload"> for each chunk → Vercel
        //    converts them into HTTP 103 Early Hints automatically
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          // TipTap / ProseMirror — ONLY used by RichTextEditor (back-office). Keep lazy.
          if (id.includes("@tiptap") || id.includes("prosemirror")) return "vendor-tiptap";
          // React core — strict match (avoid catching @tiptap/react etc.)
          if (id.match(/node_modules\/(react|react-dom|react-router|react-router-dom|@remix-run\/router|scheduler)\//)) return "vendor-react";
          // Radix — split per primitive so each route only downloads what it uses.
          if (id.includes("@radix-ui/react-")) {
            const m = id.match(/@radix-ui\/react-([a-z-]+)/);
            if (m) return `radix-${m[1]}`;
          }
          if (id.includes("@radix-ui")) return "vendor-radix-shared";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@tanstack")) return "vendor-query";
          // lucide-react: do NOT force a single chunk. Each icon is its own
          // ES module; let Rollup tree-shake and co-locate icons with the
          // routes that use them. A forced chunk loaded all ~1000 icons (~900 kB)
          // on every page even when only 5 icons were used.
          if (id.includes("date-fns")) return "vendor-date";
          if (id.includes("@floating-ui")) return "vendor-floating";
        },
      },
    },
  },
}));
