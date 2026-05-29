/**
 * youtubeUtils.ts
 *
 * CORS-safe YouTube transcript fetching.
 *
 * The Problem
 * -----------
 * Fetching `https://www.youtube.com/watch?v=...` directly from the browser is
 * blocked by YouTube's CORS policy (no Access-Control-Allow-Origin header).
 *
 * The Fix
 * -------
 * We never touch youtube.com from the browser. Instead we use a small waterfall
 * of three proxy strategies, trying each in order until one succeeds:
 *
 *   1. Local Express proxy  — `/api/youtube/transcript?videoId=…`
 *      Best option: your own server relays the request server-side (no CORS).
 *      Add the route shown at the bottom of this file to your Express app.
 *
 *   2. allorigins.win       — free public CORS proxy, wraps any URL.
 *      Reliable fallback when the local proxy isn't set up yet.
 *
 *   3. corsproxy.io         — secondary public proxy, different CDN.
 *      Last resort before we give up and throw.
 *
 * Transcript format
 * -----------------
 * YouTube returns timedtext as XML:
 *   <transcript><text start="1.23" dur="2.00">Hello world</text>...</transcript>
 *
 * We parse that into TranscriptSegment[] and also produce a plain-text string.
 */

/* ------------------------------------------------------------------ types -- */

export interface TranscriptSegment {
  /** Start time in seconds */
  start: number;
  /** Duration in seconds */
  duration: number;
  /** Human-readable timestamp, e.g. "1:23" */
  timeStr: string;
  /** Caption text (HTML entities decoded) */
  text: string;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  text: string;
}

/* --------------------------------------------------------------- helpers -- */

/** Extract the 11-char video ID from any common YouTube URL shape. */
export function extractYouTubeId(url: string): string | null {
  // Standard watch URL
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // Short URL  youtu.be/<id>
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Embed URL  youtube.com/embed/<id>
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // Bare 11-char ID passed directly
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();

  return null;
}

/** Convert seconds → "m:ss" or "h:mm:ss" */
function secondsToTimeStr(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Decode HTML entities that YouTube encodes inside caption XML. */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Numeric entities  &#160;  &#x00A0;
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/** Strip any remaining XML/HTML tags from a caption line. */
function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/* --------------------------------------------------------- XML parsing -- */

/**
 * Parse YouTube's timedtext XML response into TranscriptSegment[].
 * Handles both the legacy `<transcript>` format and the newer
 * `<timedtext>` format.
 */
function parseTranscriptXml(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  // Match every <text start="…" dur="…">…</text> element
  const regex = /<text\s+[^>]*start="([\d.]+)"[^>]*(?:dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml)) !== null) {
    const start = parseFloat(match[1]);
    const duration = match[2] ? parseFloat(match[2]) : 2.0;
    const rawText = match[3];

    const text = decodeHtmlEntities(stripTags(rawText)).trim();
    if (!text) continue;

    segments.push({
      start,
      duration,
      timeStr: secondsToTimeStr(start),
      text,
    });
  }

  return segments;
}

/* --------------------------------------------------- transcript URL builder -- */

/**
 * Build the YouTube timedtext (caption) API URL for a given video ID.
 * We request English first; if unavailable YouTube redirects to whatever
 * is available (auto-generated captions, other languages, etc.).
 */
function buildTimedTextUrl(videoId: string, lang = 'en'): string {
  return `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=xml&name=&kind=`;
}

/* -------------------------------------------------- proxy fetch strategies -- */

/**
 * Strategy 1 — Local Express proxy.
 *
 * Your Express server should expose:
 *   GET /api/youtube/transcript?videoId=<id>&lang=<lang>
 *
 * The handler fetches from YouTube server-side and streams the XML back.
 * See the Express snippet at the bottom of this file.
 */
async function fetchViaLocalProxy(videoId: string): Promise<string> {
  const res = await fetch(`/api/youtube/transcript?videoId=${encodeURIComponent(videoId)}&lang=en`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Local proxy returned ${res.status}`);
  return res.text();
}

/**
 * Strategy 2 — allorigins.win public CORS proxy.
 * https://allorigins.win/
 */
async function fetchViaAllOrigins(videoId: string): Promise<string> {
  const target = encodeURIComponent(buildTimedTextUrl(videoId));
  const res = await fetch(`https://api.allorigins.win/get?url=${target}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`allorigins returned ${res.status}`);
  const json = await res.json();
  // allorigins wraps the response in { contents: "<xml>…</xml>", status: {… } }
  if (!json.contents) throw new Error('allorigins: empty contents');
  return json.contents as string;
}

/**
 * Strategy 3 — corsproxy.io public CORS proxy.
 * https://corsproxy.io/
 */
async function fetchViaCorsProxyIo(videoId: string): Promise<string> {
  const target = encodeURIComponent(buildTimedTextUrl(videoId));
  const res = await fetch(`https://corsproxy.io/?${target}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`corsproxy.io returned ${res.status}`);
  return res.text();
}

/* ------------------------------------------------- first available language -- */

/**
 * YouTube may not have an English transcript. We try 'en' first, then
 * fall back to 'en-US', 'en-GB', and finally '' (auto-pick).
 * Each attempt goes through the full proxy waterfall.
 */
const LANG_FALLBACK_ORDER = ['en', 'en-US', 'en-GB', ''];

async function fetchTimedTextXml(videoId: string): Promise<string> {
  const strategies = [fetchViaLocalProxy, fetchViaAllOrigins, fetchViaCorsProxyIo];

  // Walk each language preference
  for (const lang of LANG_FALLBACK_ORDER) {
    // Walk each proxy strategy
    for (const strategy of strategies) {
      try {
        // For lang variants we need to use the timedtext URL directly;
        // the local proxy is only called for the first language to keep things simple.
        let xml: string;
        if (strategy === fetchViaLocalProxy) {
          const res = await fetch(
            `/api/youtube/transcript?videoId=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}`,
            { signal: AbortSignal.timeout(10_000) }
          );
          if (!res.ok) throw new Error(`Local proxy returned ${res.status}`);
          xml = await res.text();
        } else {
          // For public proxies, build the timedtext URL with the specific lang
          const timedTextUrl = buildTimedTextUrl(videoId, lang);
          const target = encodeURIComponent(timedTextUrl);
          const proxyBase =
            strategy === fetchViaAllOrigins
              ? `https://api.allorigins.win/get?url=${target}`
              : `https://corsproxy.io/?${target}`;

          const res = await fetch(proxyBase, { signal: AbortSignal.timeout(15_000) });
          if (!res.ok) throw new Error(`Proxy returned ${res.status}`);

          if (strategy === fetchViaAllOrigins) {
            const json = await res.json();
            if (!json.contents) throw new Error('allorigins: empty contents');
            xml = json.contents as string;
          } else {
            xml = await res.text();
          }
        }

        // Validate we actually got XML (not an error page)
        if (xml.includes('<text') || xml.includes('<transcript')) {
          return xml;
        }
        // Got a response but no caption data — continue to next lang/proxy
      } catch {
        // This strategy failed — try the next one
      }
    }
  }

  throw new Error(
    'Could not fetch transcript. The video may not have captions enabled, ' +
      'or all proxy routes are unavailable.'
  );
}

/* ---------------------------------------------------------- public API -- */

/**
 * Fetch and parse the transcript for a YouTube video.
 *
 * @param videoId  The 11-character YouTube video ID (use extractYouTubeId() to get it).
 * @returns        { segments, text } — structured segments and a plain-text string.
 *
 * @throws         If no transcript could be retrieved after exhausting all proxies.
 *
 * @example
 *   const id = extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 *   const { segments, text } = await fetchYouTubeTranscript(id!);
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptResult> {
  const xml = await fetchTimedTextXml(videoId);
  const segments = parseTranscriptXml(xml);

  if (segments.length === 0) {
    throw new Error(
      'Transcript XML was fetched but contained no parseable caption segments. ' +
        'The video may use image-based or non-standard captions.'
    );
  }

  const text = segments.map((s) => `[${s.timeStr}] ${s.text}`).join('\n');

  return { segments, text };
}


/* ================================================================
   EXPRESS ROUTE — add to your server/index.ts (or server.js)
   ================================================================

   This is the recommended Strategy 1. It lives server-side so there
   are zero CORS issues. Copy the block below into your Express app.

   ----------------------------------------------------------------

   import express from 'express';
   import fetch from 'node-fetch'; // or use native fetch in Node 18+

   const app = express();

   // YouTube transcript proxy
   app.get('/api/youtube/transcript', async (req, res) => {
     const { videoId, lang = 'en' } = req.query as Record<string, string>;
     if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
       return res.status(400).json({ error: 'Invalid videoId' });
     }

     const timedTextUrl =
       `https://www.youtube.com/api/timedtext` +
       `?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}&fmt=xml`;

     try {
       const upstream = await fetch(timedTextUrl, {
         headers: {
           'User-Agent':
             'Mozilla/5.0 (compatible; TranscriptProxy/1.0)',
         },
       });
       if (!upstream.ok) {
         return res.status(upstream.status).json({ error: 'Upstream error' });
       }
       const xml = await upstream.text();
       res.setHeader('Content-Type', 'application/xml; charset=utf-8');
       res.send(xml);
     } catch (err) {
       res.status(500).json({ error: String(err) });
     }
   });

   ================================================================ */