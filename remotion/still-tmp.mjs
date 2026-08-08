import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path"; import fs from "fs";
const props = JSON.parse(fs.readFileSync("/tmp/still/props.json","utf8"));
const bundled = await bundle({ entryPoint: path.resolve("src/index.ts"), webpackOverride: (c)=>c });
const browser = await openBrowser("chrome", { browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium", chromiumOptions:{args:["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"]}, chromeMode:"chrome-for-testing" });
const composition = await selectComposition({ serveUrl: bundled, id: "business-showcase", inputProps: props, puppeteerInstance: browser });
console.log("frames", composition.durationInFrames);
for (const f of [40, 160, 280, 400]) {
  if (f >= composition.durationInFrames) continue;
  await renderStill({ composition, serveUrl: bundled, output: `/tmp/still/f${f}.png`, frame: f, inputProps: props, puppeteerInstance: browser });
  console.log("still", f);
}
await browser.close({ silent: true });
