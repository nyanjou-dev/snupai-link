import { Parser } from "htmlparser2";
import { hostnameResolvesToPrivate } from "./private-ip";

const MAX_BYTES = 512 * 1024;
const MAX_VALUE_LEN = 500;
const FETCH_TIMEOUT_MS = 3000;

const ALLOWED_PROPERTIES = new Set([
  "og:title",
  "og:description",
  "og:image",
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

export type OgProp = {
  kind: "property" | "name";
  key: string;
  value: string;
};

export type OgMeta = {
  title?: string;
  properties: OgProp[];
};

/**
 * Fetches and extracts Open Graph / Twitter meta tags from the target URL
 * with SSRF, ReDoS, timeout, size, and redirect-following hardening.
 *
 * Returns `null` if the fetch is rejected for any reason. Only whitelisted
 * OG/Twitter properties are extracted. Values are truncated to MAX_VALUE_LEN;
 * callers MUST still HTML-escape before interpolating into responses.
 */
export async function fetchOgMeta(targetUrl: string): Promise<OgMeta | null> {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (await hostnameResolvesToPrivate(url.hostname)) return null;

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "manual",
      headers: {
        "User-Agent": "snupai-link-bot/1.0",
        Accept: "text/html",
      },
    });
  } catch {
    return null;
  }

  if (response.status < 200 || response.status >= 300) return null;
  if (!response.body) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (!/^text\/html/i.test(contentType)) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const result: OgMeta = { properties: [] };
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
        const trimmed = content.slice(0, MAX_VALUE_LEN);
        const prop = attribs.property?.toLowerCase();
        const named = attribs.name?.toLowerCase();
        if (prop && ALLOWED_PROPERTIES.has(prop)) {
          result.properties.push({ kind: "property", key: prop, value: trimmed });
        } else if (named && ALLOWED_PROPERTIES.has(named)) {
          result.properties.push({ kind: "name", key: named, value: trimmed });
        }
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
