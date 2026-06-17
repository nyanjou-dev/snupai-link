import { Parser } from "htmlparser2";
import { hostnameResolvesToPrivate } from "./private-ip";

const MAX_BYTES = 512 * 1024;
const MAX_VALUE_LEN = 500;
const FETCH_TIMEOUT_MS = 3000;
const MAX_REDIRECTS = 5;

// Honest bot UA first; many sites serve real metadata to declared bots.
const BOT_UA = "snupai-link-bot/1.0 (+https://snupai.link)";
// Fallback for sites whose bot management 403s declared bots (Cloudflare et
// al.). Used only when the bot UA yields no usable metadata.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const ALLOWED_PROPERTIES = new Set([
  "og:title",
  "og:description",
  "og:image",
  "og:image:url",
  "og:image:secure_url",
  "og:image:width",
  "og:image:height",
  "og:url",
  "og:type",
  "og:site_name",
  "og:video",
  "og:video:url",
  "og:video:secure_url",
  "og:video:type",
  "og:video:width",
  "og:video:height",
  "twitter:card",
  "twitter:site",
  "twitter:title",
  "twitter:description",
  "twitter:image",
  "twitter:player",
  "twitter:player:width",
  "twitter:player:height",
]);

// Properties whose values are URLs. Many sites emit these as root-relative
// ("/assets/og.png") or relative paths; crawlers request them against the
// short link's origin, so they must be resolved to absolute URLs against the
// final page URL before being served.
const URL_PROPERTIES = new Set([
  "og:image",
  "og:image:url",
  "og:image:secure_url",
  "og:video",
  "og:video:url",
  "og:video:secure_url",
  "og:url",
  "twitter:image",
]);

// Properties that make a preview worth showing. Used to decide whether the
// bot-UA result is good enough or the browser-UA fallback should run.
const MEANINGFUL_KEYS = new Set([
  "og:title",
  "og:description",
  "og:image",
  "og:image:url",
  "og:image:secure_url",
  "twitter:title",
  "twitter:image",
]);

export type OgProp = {
  kind: "property" | "name";
  key: string;
  value: string;
};

export type OgMeta = {
  title?: string;
  properties: OgProp[];
};

type FetchedDoc = { response: Response; finalUrl: string };

function resolveUrl(value: string, base: string): string | null {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

/**
 * Fetches `url` following redirects MANUALLY so that every hop is re-checked
 * against private IP ranges. The platform's `redirect: "follow"` would honor
 * `Location` without re-verifying it, letting a public hostname redirect into
 * 169.254.169.254 / RFC1918 space. Each redirect target is resolved against
 * the current URL, restricted to http(s), and SSRF-checked before fetching.
 *
 * Returns the first 2xx `text/html` response (plus its final URL), or `null`
 * on any failure: private target, non-http(s) scheme, missing/invalid
 * Location, too many hops, non-html content type, or 4xx/5xx.
 */
async function fetchFollowingRedirects(
  startUrl: URL,
  userAgent: string,
): Promise<FetchedDoc | null> {
  let currentUrl = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // Fail closed: re-check every hostname, not just the first hop.
    if (await hostnameResolvesToPrivate(currentUrl.hostname)) return null;

    let response: Response;
    try {
      response = await fetch(currentUrl.toString(), {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: "manual",
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      return null;
    }

    // 2xx: accept only html.
    if (response.status >= 200 && response.status < 300) {
      const contentType = response.headers.get("content-type") ?? "";
      if (!/^text\/html/i.test(contentType)) return null;
      return { response, finalUrl: currentUrl.toString() };
    }

    // 3xx: resolve next hop and loop. Body is unneeded; let it drop.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      let next: URL;
      try {
        next = new URL(location, currentUrl);
      } catch {
        return null;
      }
      if (next.protocol !== "http:" && next.protocol !== "https:") {
        return null;
      }
      currentUrl = next;
      continue;
    }

    // 4xx / 5xx.
    return null;
  }
  return null;
}

/**
 * Streams and parses the response body, extracting whitelisted OG/Twitter
 * meta tags and the `<title>`. URL-valued properties are resolved against
 * `finalUrl`. Values are truncated to MAX_VALUE_LEN; callers MUST still
 * HTML-escape before interpolating into responses.
 */
async function parseOg(
  response: Response,
  finalUrl: string,
): Promise<OgMeta> {
  const result: OgMeta = { properties: [] };
  if (!response.body) return result;

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let total = 0;
  let insideTitle = false;
  let titleBuf = "";

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        if (name === "title") {
          insideTitle = true;
          return;
        }
        if (name !== "meta") return;
        const content = attribs.content;
        if (typeof content !== "string") return;

        const prop = attribs.property?.toLowerCase();
        const named = attribs.name?.toLowerCase();

        let key: string | null = null;
        let kind: OgProp["kind"] | null = null;
        if (prop && ALLOWED_PROPERTIES.has(prop)) {
          key = prop;
          kind = "property";
        } else if (named && ALLOWED_PROPERTIES.has(named)) {
          key = named;
          kind = "name";
        }
        if (!key || !kind) return;

        let value = content.slice(0, MAX_VALUE_LEN);
        if (URL_PROPERTIES.has(key)) {
          // Skip empty URL values (new URL("", base) would wrongly return base).
          if (!value.trim()) return;
          const resolved = resolveUrl(value, finalUrl);
          if (!resolved) return;
          value = resolved;
        }
        result.properties.push({ kind, key, value });
      },
      ontext(text) {
        if (insideTitle && titleBuf.length < MAX_VALUE_LEN) {
          titleBuf += text;
        }
      },
      onclosetag(name) {
        if (name === "title") insideTitle = false;
      },
    },
    { decodeEntities: true },
  );

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      parser.write(decoder.decode(value, { stream: true }));
    }
    parser.end();
  } catch {
    // Stream/parse errors — return whatever we accumulated.
  }

  if (titleBuf) result.title = titleBuf.trim().slice(0, MAX_VALUE_LEN);
  return result;
}

function hasUsefulContent(meta: OgMeta): boolean {
  if (meta.title) return true;
  return meta.properties.some((p) => MEANINGFUL_KEYS.has(p.key));
}

/**
 * Fetches and extracts Open Graph / Twitter meta tags from the target URL
 * with SSRF, ReDoS, timeout, size, and redirect-following hardening.
 *
 * Tries an honest bot User-Agent first, then falls back to a browser
 * User-Agent for sites that 403 declared bots. Returns the first non-empty
 * result, or `null` if no usable metadata could be extracted. Only
 * whitelisted OG/Twitter properties are extracted. Values are truncated to
 * MAX_VALUE_LEN; callers MUST still HTML-escape before interpolating into
 * responses.
 */
export async function fetchOgMeta(targetUrl: string): Promise<OgMeta | null> {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  for (const userAgent of [BOT_UA, BROWSER_UA]) {
    const doc = await fetchFollowingRedirects(url, userAgent);
    if (!doc) continue;
    const meta = await parseOg(doc.response, doc.finalUrl);
    if (hasUsefulContent(meta)) return meta;
  }
  return null;
}
