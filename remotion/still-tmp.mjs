import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import fs from "fs";
const props = JSON.parse(fs.readFileSync("/tmp/props.json","utf8"));
const serveUrl = await bundle({ entryPoint: "/dev-server/remotion/src/index.ts", webpackOverride: c=>c });
const browser = await openBrowser("chrome", { browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium", chromiumOptions:{ args:["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"] }, chromeMode:"chrome-for-testing" });
const composition = await selectComposition({ serveUrl, id:"business-showcase", puppeteerInstance: browser, inputProps: props });
for (const [f,name] of [[200,"rev"],[240,"rev2"]]) {
  await renderStill({ composition, serveUrl, frame:f, output:`/tmp/browser/still-${name}.png`, inputProps: props, puppeteerInstance: browser });
  console.log("ok", name);
}
await browser.close({ silent:false });
