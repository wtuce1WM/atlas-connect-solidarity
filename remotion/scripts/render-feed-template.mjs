/**
 * Rendu du template « feed » depuis un manifest.
 *
 *   FEED_MANIFEST=feed/manifest.json FEED_FORMAT=landscape OUT=/mnt/documents/x.mp4 \
 *     node scripts/render-feed-template.mjs
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const manifestPath = process.env.FEED_MANIFEST ?? "feed/manifest.json";
const format = process.env.FEED_FORMAT === "landscape" ? "landscape" : "portrait";
const outputLocation =
  process.env.OUT ??
  `/mnt/documents/1wm-feed-${format === "landscape" ? "1920x1080" : "1080x1920"}.mp4`;

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

const inputProps = { manifestPath, format };

const composition = await selectComposition({
  serveUrl: bundled,
  id: format === "landscape" ? "feed-template-landscape" : "feed-template",
  inputProps,
  puppeteerInstance: browser,
});

console.log(
  `render ${composition.id} ${composition.width}x${composition.height} ` +
    `${composition.durationInFrames}f @${composition.fps} -> ${outputLocation}`,
);

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation,
  inputProps,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
});

await browser.close({ silent: false });
console.log("DONE", outputLocation);
