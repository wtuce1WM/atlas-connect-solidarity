import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "owm_blog_session";
const SENT_KEY_PREFIX = "owm_blog_view_";

function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "anonymous";
  }
}

function getDevice(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/mobile|iphone|android.*mobile/i.test(ua)) return "mobile";
  if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) return "tablet";
  return "desktop";
}

function getReferrerDomain(): string | null {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname;
    if (host === window.location.hostname) return null;
    return host;
  } catch {
    return null;
  }
}

/**
 * Logs one blog article view per slug per session (dedup via sessionStorage).
 * `source` distinguishes the reading context (site, embed, export…).
 */
export async function logBlogView(
  slug: string,
  language: string,
  source: string = "site",
): Promise<void> {
  if (!slug) return;
  const dedupKey = `${SENT_KEY_PREFIX}${source}_${slug}`;
  try {
    if (sessionStorage.getItem(dedupKey)) return;
    sessionStorage.setItem(dedupKey, "1");
  } catch {
    /* ignore */
  }

  try {
    await supabase.from("blog_post_views").insert({
      slug,
      language,
      session_id: getSessionId(),
      source,
      referrer_domain: getReferrerDomain(),
      device: getDevice(),
    });
  } catch {
    /* silent: analytics must never break the page */
  }
}
