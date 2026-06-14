import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { spawn, spawnSync } from 'child_process';
import si from 'systeminformation';
import { search } from 'duck-duck-scrape';
import { resolveCoderPath } from './utils.js';

const PORT = 3000;

const getLuminaDataDir = () => {
  return process.env.LUMINA_DATA_DIR || path.join(os.homedir(), '.lumina');
};

const extensionFromMime = (mimeType = '') => {
  const clean = mimeType.split(';')[0].trim().toLowerCase();
  if (clean === 'audio/wav' || clean === 'audio/wave' || clean === 'audio/x-wav') return '.wav';
  if (clean === 'audio/mpeg' || clean === 'audio/mp3') return '.mp3';
  if (clean === 'audio/mp4' || clean === 'video/mp4') return '.mp4';
  if (clean === 'audio/flac') return '.flac';
  if (clean === 'audio/ogg' || clean === 'audio/opus') return '.ogg';
  if (clean === 'audio/webm' || clean === 'video/webm') return '.webm';
  return '.webm';
};

const cleanWhisperTranscript = (raw: string) => {
  return String(raw || '')
    .split(/\r?\n/)
    .map(line => line
      .replace(/^\s*\[[^\]]*-->\s*[^\]]*\]\s*/g, '')
      .replace(/^\s*\[[0-9:.]+\s*-->\s*[0-9:.]+\]\s*/g, '')
      .trim())
    .filter(line => {
      if (!line) return false;
      const lower = line.toLowerCase();
      return !lower.includes('[nodejs-whisper]') &&
        !lower.startsWith('whisper_') &&
        !lower.startsWith('system_info:') &&
        !lower.startsWith('main:');
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

type TerminalSession = {
  cwd: string;
  lastAccess: number;
};

const terminalSessions = new Map<string, TerminalSession>();

function getTerminalSession(sessionId?: string): { id: string; session: TerminalSession } {
  if (!sessionId || !terminalSessions.has(sessionId)) {
    const newSession: TerminalSession = {
      cwd: process.cwd(),
      lastAccess: Date.now(),
    };
    const id = sessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    terminalSessions.set(id, newSession);
    return { id, session: newSession };
  }
  const session = terminalSessions.get(sessionId)!;
  session.lastAccess = Date.now();
  return { id: sessionId, session };
}

// Clean up stale terminal sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, sess] of terminalSessions.entries()) {
    if (now - sess.lastAccess > 60 * 60 * 1000) {
      terminalSessions.delete(id);
    }
  }
}, 10 * 60 * 1000);

// ─── Unix → PowerShell command translation (Windows only) ─────────────────
const PS_CMD_MAP: Record<string, string> = {
  'cat': 'Get-Content', 'cp': 'Copy-Item', 'mv': 'Move-Item',
  'rm': 'Remove-Item', 'grep': 'Select-String', 'which': 'Get-Command',
  'head': 'Select-Object', 'tail': 'Select-Object',
  'wc': 'Measure-Object', 'sort': 'Sort-Object', 'diff': 'Compare-Object',
  'find': 'Where-Object', 'touch': 'New-Item',
  'whoami': 'whoami', 'echo': 'Write-Output',
  'ps': 'Get-Process', 'kill': 'Stop-Process',
  'curl': 'Invoke-WebRequest', 'wget': 'Invoke-WebRequest',
  'date': 'Get-Date', 'alias': 'Get-Alias', 'history': 'Get-History',
  'man': 'Get-Help', 'ping': 'Test-Connection',
};

function firstWordOf(s: string): string {
  return s.split(/\s+/)[0].replace(/["']/g, '').toLowerCase();
}

function translateLs(rest: string): string {
  let target = '';
  let hasForce = false, hasRecurse = false, hasReverse = false;
  let extraPipes = '';
  const parts = rest.match(/\S+/g) || [];
  for (const p of parts) {
    if (p.startsWith('--')) {
      const f = p.slice(2);
      if (f === 'all' || f === 'almost-all') hasForce = true;
      else if (f === 'recursive') hasRecurse = true;
      else if (f === 'reverse') hasReverse = true;
      else target = p;
    } else if (p.startsWith('-') && p.length > 1) {
      for (const ch of p.slice(1)) {
        switch (ch) {
          case 'a': hasForce = true; break;
          case 'R': hasRecurse = true; break;
          case 'r': hasReverse = true; break;
          case 'S': extraPipes = ' | Sort-Object Length -Descending'; break;
          case 't': extraPipes = ' | Sort-Object LastWriteTime -Descending'; break;
        }
      }
    } else {
      target = p;
    }
  }
  let cmd = 'Get-ChildItem';
  if (target) cmd += ` -Path "${target.replace(/"/g, '\\"')}"`;
  if (hasForce) cmd += ' -Force';
  if (hasRecurse) cmd += ' -Recurse';
  cmd += extraPipes || ' | Format-Table -AutoSize';
  return cmd;
}

function translateRm(rest: string): string {
  let target = '';
  let recurse = false, force = false;
  const parts = rest.match(/\S+/g) || [];
  for (const p of parts) {
    if (p.startsWith('-') && p.length > 1) {
      for (const ch of p.slice(1)) {
        if (ch === 'r' || ch === 'R') recurse = true;
        if (ch === 'f') force = true;
      }
    } else {
      target = p;
    }
  }
  if (!target) return 'Remove-Item';
  let cmd = `Remove-Item -Path "${target.replace(/"/g, '\\"')}"`;
  if (recurse) cmd += ' -Recurse';
  if (force) cmd += ' -Force';
  return cmd;
}

function translateCpMv(rest: string, cmd: string): string {
  let src = '', dst = '';
  let recurse = false, force = false;
  const parts = rest.match(/\S+/g) || [];
  for (const p of parts) {
    if (p.startsWith('-') && p.length > 1) {
      for (const ch of p.slice(1)) {
        if (ch === 'r' || ch === 'R') recurse = true;
        if (ch === 'f') force = true;
      }
    } else if (!src) {
      src = p;
    } else {
      dst = p;
    }
  }
  let ps = cmd;
  if (src) ps += ` -Path "${src.replace(/"/g, '\\"')}"`;
  if (dst) ps += ` -Destination "${dst.replace(/"/g, '\\"')}"`;
  if (recurse) ps += ' -Recurse';
  if (force) ps += ' -Force';
  return ps;
}

function translateGrep(rest: string): string {
  const parts = rest.match(/\S+/g) || [];
  const pattern: string[] = [];
  const files: string[] = [];
  let inPattern = false, invert = false, ignoreCase = false;
  for (const p of parts) {
    if (p.startsWith('-') && p.length > 1) {
      for (const ch of p.slice(1)) {
        if (ch === 'i') ignoreCase = true;
        if (ch === 'v') invert = true;
      }
    } else if (!inPattern) {
      pattern.push(p);
      inPattern = true;
    } else {
      files.push(p);
    }
  }
  let ps = `Select-String -Pattern "${pattern.join(' ').replace(/"/g, '\\"')}"`;
  if (files.length > 0) ps += ` -Path "${files.map(f => f.replace(/"/g, '\\"')).join(',')}"`;
  if (ignoreCase) ps += ' -CaseSensitive:$false';
  if (invert) ps += ' -NotMatch';
  return ps;
}

function translateSegment(seg: string): string {
  const t = seg.trim();
  if (!t) return t;
  const fw = firstWordOf(t);
  const rest = t.slice(fw.length).trim();

  switch (fw) {
    case 'ls': return translateLs(rest);
    case 'rm': return translateRm(rest);
    case 'cp': return translateCpMv(rest, 'Copy-Item');
    case 'mv': return translateCpMv(rest, 'Move-Item');
    case 'grep': return translateGrep(rest);
    case 'mkdir': return `New-Item -ItemType Directory -Path "${rest.replace(/"/g, '\\"')}"`;
    case 'touch': return `New-Item -ItemType File -Path "${(rest || '.').replace(/"/g, '\\"')}" -Force`;
    case 'pwd': return 'Get-Location | Select-Object -ExpandProperty Path';
    case 'ps': return 'Get-Process | Format-Table -AutoSize';
    case 'kill': return `Stop-Process ${rest.replace(/^-/, '-Id ')}`;
    case 'which': return `Get-Command ${rest || ''} | Select-Object -ExpandProperty Source`;
    case 'chmod': return 'Write-Output "chmod is not available on Windows"';
    case 'chown': return 'Write-Output "chown is not available on Windows"';
    case 'ifconfig': return 'Get-NetIPConfiguration | Format-Table -AutoSize';
    case 'netstat': return 'Get-NetTCPConnection | Format-Table -AutoSize';
    case 'uname': return rest?.includes('-a') ? '[Environment]::OSVersion | Format-List *' : '[Environment]::OSVersion.OSVersion.Platform';
    case 'head': {
      const n = rest.match(/-n\s+(\d+)/);
      return `Select-Object -First ${n ? n[1] : 10}`;
    }
    case 'tail': {
      const n = rest.match(/-n\s+(\d+)/);
      return `Select-Object -Last ${n ? n[1] : 10}`;
    }
    case 'wc': return 'Measure-Object -Line -Word -Character | Select-Object Lines, Words, Characters';
    case 'clear': return 'Clear-Host';
    case 'exit': return 'exit';
    default: {
      if (PS_CMD_MAP[fw]) {
        return `${PS_CMD_MAP[fw]} ${rest}`;
      }
      return seg;
    }
  }
}

function translateCommand(cmd: string): string {
  return cmd.split(/(\||;)/g).map((part) => {
    if (part === '|' || part === ';') return part;
    return translateSegment(part);
  }).join('');
}

// Scraper utilities
type ScrapeStrategy = 'static' | 'dynamic' | 'crawl';
type LightpandaCloudConfig = {
  region?: 'euwest' | 'uswest' | 'useast';
  token?: string;
  browser?: string;
  proxy?: string;
};

const DEFAULT_SCRAPER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const DEFAULT_LIGHTPANDA_CLOUD_REGION = (process.env.LIGHTPANDA_CLOUD_REGION || 'euwest') as NonNullable<LightpandaCloudConfig['region']>;
const DEFAULT_LIGHTPANDA_CLOUD_BROWSER = process.env.LIGHTPANDA_CLOUD_BROWSER || 'lightpanda';
const DEFAULT_LIGHTPANDA_CLOUD_PROXY = process.env.LIGHTPANDA_CLOUD_PROXY || 'fast_dc';
const LIGHTPANDA_CLOUD_HOSTS: Record<NonNullable<LightpandaCloudConfig['region']>, string> = {
  euwest: 'euwest.cloud.lightpanda.io',
  uswest: 'uswest.cloud.lightpanda.io',
  useast: 'useast.cloud.lightpanda.io',
};

const getScraperHeaders = () => ({
  'User-Agent': DEFAULT_SCRAPER_UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
});

const isPrivateHostname = (hostname: string) => {
  const lower = hostname.toLowerCase();
  return (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower.startsWith('192.168.') ||
    lower.startsWith('10.') ||
    lower.startsWith('169.254.') ||
    lower.endsWith('.local')
  );
};

const containsSuspiciousSelector = (selectors: Record<string, string> = {}) =>
  Object.entries(selectors).some(([, value]) => typeof value === 'string' && (value.includes('<script') || value.toLowerCase().includes('javascript:')));

const getSearchQueryIfSearchEngine = (urlStr: string): string | null => {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    const isSearchEngine = host.includes('google.') || host.includes('bing.') || host.includes('duckduckgo.') || host.includes('yahoo.');
    if (!isSearchEngine) return null;
    const q = parsed.searchParams.get('q') || parsed.searchParams.get('query') || parsed.searchParams.get('p') || parsed.searchParams.get('text');
    if (q && q.trim()) return q.trim();
    if (parsed.hash) {
      const hashParams = new URLSearchParams(parsed.hash.substring(1));
      const hashQ = hashParams.get('q') || hashParams.get('query');
      if (hashQ && hashQ.trim()) return hashQ.trim();
    }
  } catch {}
  return null;
};

const isWrongOrGarbageLink = (linkUrl: string, srcUrl: string): boolean => {
  try {
    const parsed = new URL(linkUrl);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const search = parsed.search.toLowerCase();
    const sourceHost = new URL(srcUrl).hostname.toLowerCase();
    const socialMediaPatterns = ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com', 'pinterest.com', 'youtube.com', 'youtu.be', 'tiktok.com', 'snapchat.com', 'whatsapp.com', 'reddit.com', 'tumblr.com', 'flickr.com', 'vimeo.com'];
    if (socialMediaPatterns.some((domain) => host.includes(domain)) && !sourceHost.includes(host) && !host.includes(sourceHost)) return true;
    const adPatterns = ['ads.', 'adserver', 'doubleclick', 'googleadservices', 'amazon-adsystem', 'taboola', 'outbrain', 'adsystem', 'affiliate', 'adnxs', 'marketing', 'analytics', 'pixel', 'clktrkr'];
    if (adPatterns.some((pattern) => host.includes(pattern) || path.includes(pattern) || search.includes(pattern))) return true;
    const clutterPatterns = ['/privacy', '/terms', '/cookie', '/contact', '/about-us', '/about/info', '/tos', '/disclaimer', '/help', '/support', '/faq', '/subscribe', '/newsletter', '/login', '/signin', '/signup', '/register', '/cart', '/checkout', '/account', '/profile', '/settings', '/feedback', '/sitemap'];
    if (clutterPatterns.some((pattern) => path === pattern || path.startsWith(pattern + '/') || path.endsWith(pattern))) return true;
    if (host === sourceHost && (path.includes('/search') || search.includes('?s=') || search.includes('&s=') || search.includes('?q=') || search.includes('&q='))) return true;
    const nonScrapableExtensions = ['.zip', '.pdf', '.docx', '.xlsx', '.pptx', '.bin', '.tar', '.gz', '.dmg', '.exe', '.mp3', '.mp4', '.avi', '.mov', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    if (nonScrapableExtensions.some((ext) => path.endsWith(ext))) return true;
  } catch {}
  return false;
};

const decodeRedirectUrl = (urlStr: string): string => {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('duckduckgo.com') && parsed.searchParams.has('uddg')) return parsed.searchParams.get('uddg') || urlStr;
    if (host.includes('google.') && parsed.pathname === '/url') return parsed.searchParams.get('url') || parsed.searchParams.get('q') || urlStr;
    if (parsed.pathname === '/url' || parsed.pathname === '/redirect') {
      return parsed.searchParams.get('url') || parsed.searchParams.get('q') || parsed.searchParams.get('to') || parsed.searchParams.get('target') || urlStr;
    }
  } catch {}
  return urlStr;
};

const checkRobotsTxt = async (targetUrl: string): Promise<{ allowed: boolean; warning?: string }> => {
  try {
    const parsed = new URL(targetUrl);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const response = await axios.get(robotsUrl, { timeout: 3000, headers: { 'User-Agent': DEFAULT_SCRAPER_UA } });
    if (response.status === 200 && typeof response.data === 'string') {
      const lines = response.data.split('\n');
      let inWildcardAgent = false;
      const pathToCheck = parsed.pathname + parsed.search;
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.toLowerCase().startsWith('user-agent:')) {
          inWildcardAgent = (line.split(':')[1]?.trim() || '') === '*';
        }
        if (inWildcardAgent && line.toLowerCase().startsWith('disallow:')) {
          const rule = line.split(':')[1]?.trim() || '';
          if (rule && pathToCheck.startsWith(rule)) {
            return { allowed: false, warning: `Robots.txt on ${parsed.host} disallows crawling paths matching "${rule}". Proceeded via user override.` };
          }
        }
      }
    }
  } catch {}
  return { allowed: true };
};

const decodeDuckDuckGoRedirectUrl = (inputUrl: string): string => {
  try {
    const parsed = new URL(inputUrl);
    const uddg = parsed.searchParams.get('uddg');
    if (uddg) {
      return decodeURIComponent(uddg);
    }
  } catch {}
  return inputUrl;
};

const normalizeSearchResults = (rawResults: any[] = []) =>
  rawResults
    .map((result: any) => ({
      title: String(result?.title || '').trim(),
      url: String(result?.url || result?.link || '').trim(),
      snippet: String(result?.snippet || result?.description || result?.content || '').trim()
    }))
    .filter((result: any) => result.url);

const searchDuckDuckGoHtml = async (query: string) => {
  const response = await axios.get('https://html.duckduckgo.com/html/', {
    params: { q: query },
    timeout: 15000,
    headers: {
      'User-Agent': DEFAULT_SCRAPER_UA,
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  const $ = cheerio.load(typeof response.data === 'string' ? response.data : '');
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  $('.result').each((_, element) => {
    const anchor = $(element).find('.result__title a, a.result__a').first();
    const snippet = $(element).find('.result__snippet').first().text().trim();
    const title = anchor.text().trim();
    const href = anchor.attr('href');
    if (!title || !href) return;

    results.push({
      title,
      url: decodeDuckDuckGoRedirectUrl(href),
      snippet
    });
  });

  return results.filter((result) => /^https?:\/\//i.test(result.url));
};

const runDuckDuckGoSearch = async (query: string) => {
  try {
    const ddgResults = await search(query, {
      region: 'wt-wt',
      safeSearch: -1,
      time: 'y',
      offset: 0
    });

    const normalized = normalizeSearchResults(ddgResults.results || []);
    if (normalized.length > 0) {
      return {
        results: normalized,
        related: Array.isArray(ddgResults.related) ? ddgResults.related : []
      };
    }
  } catch (error) {
    console.warn('DuckDuckGo package search failed, trying HTML fallback:', error);
  }

  const fallbackResults = await searchDuckDuckGoHtml(query);
  return { results: fallbackResults, related: [] };
};

const buildScrapeResultFromHtml = ({
  html,
  effectiveUrl,
  requestedUrl,
  statusCode,
  selectors,
  extractLinks,
  extractImages,
  extractTables,
  outputFormat,
  robotsWarning,
  strategy,
  engine
}: any) => {
  const $ = cheerio.load(html || '');
  const effectiveParsedUrl = new URL(effectiveUrl);
  const foundVideos: Array<{ title: string; url: string; type: 'youtube' | 'vimeo' | 'direct' | 'other' }> = [];

  $('iframe').each((_, el) => {
    const srcAttr = $(el).attr('src');
    const titleAttr = $(el).attr('title') || 'Embedded Video';
    if (!srcAttr) return;
    try {
      const absSrc = new URL(srcAttr, effectiveUrl).href;
      if (absSrc.includes('youtube.com/') || absSrc.includes('youtu.be/') || absSrc.includes('youtube-nocookie.com/')) foundVideos.push({ title: titleAttr.trim(), url: absSrc, type: 'youtube' });
      else if (absSrc.includes('vimeo.com/')) foundVideos.push({ title: titleAttr.trim(), url: absSrc, type: 'vimeo' });
      else if (absSrc.endsWith('.mp4') || absSrc.endsWith('.webm') || absSrc.endsWith('.ogg')) foundVideos.push({ title: titleAttr.trim(), url: absSrc, type: 'direct' });
      else if (absSrc.includes('/embed/')) foundVideos.push({ title: titleAttr.trim(), url: absSrc, type: 'other' });
    } catch {}
  });

  $('video').each((_, el) => {
    $(el).find('source').each((_, srcEl) => {
      const src = $(srcEl).attr('src');
      if (!src) return;
      try {
        foundVideos.push({ title: $(el).attr('title') || 'HTML5 Video Source', url: new URL(src, effectiveUrl).href, type: 'direct' });
      } catch {}
    });
    const srcAttr = $(el).attr('src');
    if (srcAttr) {
      try {
        foundVideos.push({ title: $(el).attr('title') || 'HTML5 Video Direct', url: new URL(srcAttr, effectiveUrl).href, type: 'direct' });
      } catch {}
    }
  });

  $('script, style, noscript, iframe, link, svg, video, audio').remove();

  const result: any = {
    url: effectiveUrl,
    requestedUrl,
    title: $('title').text().trim() || $('h1').first().text().trim() || effectiveParsedUrl.hostname,
    statusCode,
    scrapedAt: new Date().toISOString(),
    data: {},
    links: [],
    images: [],
    tables: [],
    videos: Array.from(new Map(foundVideos.map((item) => [item.url, item])).values()).slice(0, 30),
    strategy,
    engine
  };

  if (robotsWarning) result.robotsWarning = robotsWarning;

  if (selectors && typeof selectors === 'object' && Object.keys(selectors).length > 0) {
    const customData: Record<string, any> = {};
    for (const [key, selector] of Object.entries(selectors)) {
      if (typeof selector !== 'string') continue;
      const matches: string[] = [];
      $(selector).each((_, el) => {
        const textVal = $(el).text().trim();
        if (textVal) matches.push(textVal);
      });
      customData[key] = matches.length === 1 ? matches[0] : matches;
    }
    result.data = customData;
  } else {
    const headings: Array<{ level: string; text: string }> = [];
    $('h1, h2, h3, h4').each((_, el) => {
      const txt = $(el).text().trim();
      if (txt) headings.push({ level: el.tagName.toLowerCase(), text: txt });
    });
    const paragraphs: string[] = [];
    $('p').each((_, el) => {
      const txt = $(el).text().trim();
      if (txt && txt.length > 30) paragraphs.push(txt);
    });
    result.data = {
      headings: headings.slice(0, 30),
      paragraphs: paragraphs.slice(0, 50),
      metaDescription: $('meta[name="description"]').attr('content') || ''
    };
  }

  if (extractLinks) {
    const foundLinks = new Set<string>();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      try {
        let absUrl = new URL(href, effectiveUrl).href;
        absUrl = decodeRedirectUrl(absUrl);
        if (absUrl !== effectiveUrl && !absUrl.includes('#') && !isWrongOrGarbageLink(absUrl, effectiveUrl)) foundLinks.add(absUrl);
      } catch {}
    });
    result.links = Array.from(foundLinks).slice(0, 500);
  }

  if (extractImages) {
    const foundImages = new Set<string>();
    $('img[src]').each((_, el) => {
      const srcAttr = $(el).attr('src');
      if (!srcAttr) return;
      try {
        foundImages.add(new URL(srcAttr, effectiveUrl).href);
      } catch {}
    });
    result.images = Array.from(foundImages).slice(0, 50);
  }

  if (extractTables) {
    const resolvedTables: Array<string[][]> = [];
    $('table').each((_, tableEl) => {
      const currentTable: string[][] = [];
      $(tableEl).find('tr').each((_, rowEl) => {
        const rowData: string[] = [];
        $(rowEl).find('td, th').each((_, cellEl) => {
          rowData.push($(cellEl).text().trim().replace(/\s+/g, ' '));
        });
        if (rowData.length > 0) currentTable.push(rowData);
      });
      if (currentTable.length > 0) resolvedTables.push(currentTable);
    });
    result.tables = resolvedTables.slice(0, 5);
  }

  try {
    const turndownService = new TurndownService({
      headingStyle: 'atx' as const,
      codeBlockStyle: 'fenced' as const,
      bulletListMarker: '-' as const
    });
    turndownService.keep(['table']);
    const bodyContent = $('body').html();
    if (bodyContent) {
      let convertedMarkdown = turndownService.turndown(bodyContent);
      if (convertedMarkdown.length > 100000) convertedMarkdown = convertedMarkdown.slice(0, 100000) + '\n\n... [Content Truncated due to size limit] ...';
      result.rawText = convertedMarkdown;
    }
  } catch {
    result.rawText = $('body').text().slice(0, 100000);
  }

  if (outputFormat === 'markdown') result.formattedOutput = result.rawText;
  else if (outputFormat === 'html') result.formattedOutput = $.html();
  else result.formattedOutput = JSON.stringify(result.data, null, 2);

  return result;
};

const resolveScrapeTargetUrl = async (inputUrl: string) => {
  const searchQuery = getSearchQueryIfSearchEngine(inputUrl);
  if (!searchQuery) return inputUrl;
  const ddgResults = await runDuckDuckGoSearch(searchQuery);
  const resultsList = (ddgResults.results || []).filter((r: any) => r.url && !isWrongOrGarbageLink(r.url, inputUrl));
  if (resultsList.length === 0) throw new Error(`Could not resolve the search page into a real website for query: ${searchQuery}`);
  return resultsList[0].url;
};

const SCRAPER_UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
];

const scrapeStaticPage = async (targetUrl: string, retries = 2) => {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ua = SCRAPER_UA_POOL[attempt % SCRAPER_UA_POOL.length];
      const response = await axios.get(targetUrl, {
        timeout: 20000,
        headers: { ...getScraperHeaders(), 'User-Agent': ua, 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        maxRedirects: 10,
        responseType: 'arraybuffer'
      });
      const rawData = response.data?.length > 5 * 1024 * 1024 ? response.data.slice(0, 500 * 1024) : response.data;
      return {
        html: rawData.toString('utf8'),
        statusCode: response.status,
        finalUrl: response.request?.res?.responseUrl || targetUrl
      };
    } catch (err: any) {
      lastError = err;
      if (err?.response?.status === 404 || err?.response?.status === 410) break;
      if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
};

const buildLightpandaCloudCdpUrl = (cloud?: LightpandaCloudConfig) => {
  const region = (cloud?.region && LIGHTPANDA_CLOUD_HOSTS[cloud.region]) ? cloud.region : DEFAULT_LIGHTPANDA_CLOUD_REGION;
  const token = String(cloud?.token || process.env.LIGHTPANDA_CLOUD_TOKEN || '').trim();
  if (!token) {
    throw new Error('Lightpanda Cloud is enabled, but no cloud token was provided.');
  }

  const browser = String(cloud?.browser || DEFAULT_LIGHTPANDA_CLOUD_BROWSER || 'lightpanda').trim() || 'lightpanda';
  const proxy = String(cloud?.proxy || DEFAULT_LIGHTPANDA_CLOUD_PROXY || 'fast_dc').trim() || 'fast_dc';
  const endpoint = new URL(`wss://${LIGHTPANDA_CLOUD_HOSTS[region]}/ws`);
  endpoint.searchParams.set('token', token);
  endpoint.searchParams.set('browser', browser);
  endpoint.searchParams.set('proxy', proxy);
  return endpoint.toString();
};

const connectToLightpandaCloud = async (cloud?: LightpandaCloudConfig) => {
  let playwrightMod: any;
  try {
    playwrightMod = await import('playwright-core');
  } catch {
    throw new Error('Dynamic scraping requested, but the "playwright-core" package is not installed.');
  }

  let browser: any = null;
  let cleanup = async () => {};
  const cdpUrl = buildLightpandaCloudCdpUrl(cloud);
  browser = await playwrightMod.chromium.connectOverCDP({ endpointURL: cdpUrl });
  cleanup = async () => {
    try {
      if (browser) await browser.close();
    } catch {}
  };
  return { browser, cdpUrl, engineLabel: 'lightpanda-cloud', cleanup };
};

const withLightpandaSession = async <T>(cloud: LightpandaCloudConfig | undefined, fn: (helpers: { browser: any; cdpUrl: string; engineLabel: string }) => Promise<T>) => {
  const session = await connectToLightpandaCloud(cloud);
  let browser: any = null;
  try {
    browser = session.browser;
    return await fn({ browser, cdpUrl: session.cdpUrl, engineLabel: session.engineLabel });
  } finally {
    await session.cleanup();
  }
};

const scrapeDynamicPage = async (
  targetUrl: string,
  _engine: string,
  waitForSelector?: string,
  lightpandaCloudConfig?: LightpandaCloudConfig
): Promise<{ html: string; statusCode: number; finalUrl: string; cdpUrl: string; engineLabel: string }> =>
  withLightpandaSession(lightpandaCloudConfig, async ({ browser, cdpUrl, engineLabel }) => {
    try {
      const context = await browser.newContext({
        userAgent: DEFAULT_SCRAPER_UA
      });
      const page = await context.newPage();
      const response = await page.goto(targetUrl, { waitUntil: 'networkidle' });
      if (waitForSelector) await page.waitForSelector(waitForSelector, { timeout: 10000 });
      const html = await page.content();
      const finalUrl = page.url();
      await page.close();
      await context.close();
      return {
        html,
        statusCode: response?.status() || 200,
        finalUrl,
        cdpUrl,
        engineLabel,
      };
    } catch (error: any) {
      throw new Error(`Lightpanda CDP session failed at ${cdpUrl}: ${error?.message || 'Unknown error'}`);
    }
  });

const scrapeWithCrawler = async (
  targetUrl: string,
  useJavaScript: boolean,
  maxPages: number,
  selectors: Record<string, string> | undefined,
  lightpandaCloudConfig?: LightpandaCloudConfig
): Promise<{
  url: string;
  requestedUrl: string;
  title: string;
  statusCode: number;
  scrapedAt: string;
  data: { pages: Array<{ pageNumber: number; url: string; title: string; data: any }>; totalPages: number };
  links: any[];
  images: any[];
  tables: any[];
  rawText: string;
  strategy: 'crawl';
  engine: string;
  robotsWarning?: string;
}> => {
  let crawleeMod: any;
  try {
    crawleeMod = await import('crawlee');
  } catch {
    throw new Error('Crawl scraping requested, but the "crawlee" package is not installed.');
  }

  const pages: any[] = [];
  const requestLimit = Math.min(Math.max(maxPages || 3, 1), 10);

  if (useJavaScript) {
    const { PlaywrightCrawler } = crawleeMod;
    const crawler = new PlaywrightCrawler({
      launchContext: {
        launcher: async () => {
          const session = await connectToLightpandaCloud(lightpandaCloudConfig);
          const browser = session.browser;
          browser.on?.('disconnected', () => {
            void session.cleanup();
          });
          return browser;
        }
      },
      maxRequestsPerCrawl: requestLimit,
      requestHandler: async ({ request, page, enqueueLinks }: any) => {
        pages.push({
          url: page.url(),
          title: await page.title(),
          html: await page.content()
        });
        if (pages.length < requestLimit) {
          await enqueueLinks({ strategy: 'same-domain' });
        }
      }
    });
    await crawler.run([targetUrl]);
  } else {
    const { CheerioCrawler } = crawleeMod;
    const crawler = new CheerioCrawler({
      maxRequestsPerCrawl: requestLimit,
      requestHandler: async ({ request, $, enqueueLinks }: any) => {
        pages.push({
          url: request.loadedUrl || request.url,
          title: $('title').text().trim() || $('h1').first().text().trim() || request.url,
          html: $.html()
        });
        if (pages.length < requestLimit) {
          await enqueueLinks({ strategy: 'same-domain' });
        }
      }
    });
    await crawler.run([targetUrl]);
  }

  const combinedData = pages.map((page, index) => {
    const pageResult = buildScrapeResultFromHtml({
      html: page.html,
      effectiveUrl: page.url,
      requestedUrl: targetUrl,
      statusCode: 200,
      selectors,
      extractLinks: true,
      extractImages: true,
      extractTables: true,
      outputFormat: 'json',
      strategy: 'crawl',
      engine: useJavaScript ? 'lightpanda-cloud' : 'cheerio'
    });
    return {
      pageNumber: index + 1,
      url: page.url,
      title: page.title,
      data: pageResult.data
    };
  });

  return {
    url: targetUrl,
    requestedUrl: targetUrl,
    title: combinedData[0]?.title || targetUrl,
    statusCode: 200,
    scrapedAt: new Date().toISOString(),
    data: {
      pages: combinedData,
      totalPages: combinedData.length
    },
    links: [],
    images: [],
    tables: [],
    rawText: combinedData.map((page: any) => `# ${page.title}\n${JSON.stringify(page.data, null, 2)}`).join('\n\n'),
    strategy: 'crawl',
    engine: useJavaScript ? 'lightpanda-cloud' : 'cheerio'
  };
};

export function setupToolRoutes(app: express.Express) {
  // Speech-to-Text
  app.post("/api/stt/transcribe", async (req, res) => {
    const { audioBase64, mimeType = 'audio/webm', modelName = 'base.en', language } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const audioBuffer = Buffer.from(audioBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (!audioBuffer.length) {
      return res.status(400).json({ error: 'Audio payload is empty' });
    }

    const sttRoot = path.join(getLuminaDataDir(), 'local-stt');
    const audioDir = path.join(sttRoot, 'audio');
    const modelRootPath = path.join(sttRoot, 'models');
    fs.mkdirSync(audioDir, { recursive: true });
    fs.mkdirSync(modelRootPath, { recursive: true });

    const audioPath = path.join(audioDir, `voice-${Date.now()}-${Math.random().toString(36).slice(2)}${extensionFromMime(mimeType)}`);
    fs.writeFileSync(audioPath, audioBuffer);

    try {
      if (process.platform === 'win32') {
        const whisperCppPath = path.join(process.cwd(), 'node_modules', 'nodejs-whisper', 'cpp', 'whisper.cpp');
        const execName = 'whisper-cli.exe';
        const possiblePaths = [
          path.join(whisperCppPath, 'build', 'bin', execName),
          path.join(whisperCppPath, 'build', 'bin', 'Release', execName),
          path.join(whisperCppPath, 'build', 'bin', 'Debug', execName),
          path.join(whisperCppPath, 'build', execName),
          path.join(whisperCppPath, execName)
        ];
        const exists = possiblePaths.some(p => fs.existsSync(p));
        if (!exists) {
          console.log('[Lumina Server] Local Whisper CLI binary not found on Windows. Downloading prebuilt binary...');
          const zipUrl = 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.8.4/whisper-bin-x64.zip';
          const targetDir = path.join(whisperCppPath, 'build', 'bin', 'Release');
          fs.mkdirSync(targetDir, { recursive: true });
          const zipPath = path.join(whisperCppPath, 'whisper-bin-x64.zip');
          
          const response = await axios({
            method: 'get',
            url: zipUrl,
            responseType: 'arraybuffer'
          });
          fs.writeFileSync(zipPath, response.data);
          
          const { execSync } = await import('child_process');
          execSync(`powershell.exe -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`);
          fs.unlinkSync(zipPath);
          
          const nestedReleaseDir = path.join(targetDir, 'Release');
          if (fs.existsSync(nestedReleaseDir) && fs.statSync(nestedReleaseDir).isDirectory()) {
            const files = fs.readdirSync(nestedReleaseDir);
            for (const file of files) {
              const src = path.join(nestedReleaseDir, file);
              const dest = path.join(targetDir, file);
              fs.renameSync(src, dest);
            }
            fs.rmdirSync(nestedReleaseDir);
          }
          console.log('[Lumina Server] Prebuilt Whisper CLI binary downloaded and configured successfully.');
        }
      }

      const whisperModule: any = await import('nodejs-whisper');
      const nodewhisper = whisperModule.nodewhisper || whisperModule.default?.nodewhisper;
      if (typeof nodewhisper !== 'function') {
        throw new Error('nodejs-whisper did not expose nodewhisper().');
      }

      const whisperLanguage = typeof language === 'string' && language
        ? language.split('-')[0].toLowerCase()
        : undefined;
      const logs: string[] = [];
      const logger = {
        debug: (...args: any[]) => logs.push(args.map(String).join(' ')),
        log: (...args: any[]) => logs.push(args.map(String).join(' ')),
        error: (...args: any[]) => logs.push(args.map(String).join(' '))
      };

      const rawTranscript = await nodewhisper(audioPath, {
        modelName,
        autoDownloadModelName: modelName,
        modelRootPath,
        removeWavFileAfterTranscription: true,
        withCuda: false,
        logger,
        whisperOptions: {
          language: whisperLanguage,
          outputInText: false,
          outputInSrt: false,
          outputInVtt: false,
          outputInJson: false,
          splitOnWord: true,
          noGpu: true
        }
      });

      try { fs.unlinkSync(audioPath); } catch {}
      res.json({
        success: true,
        transcript: cleanWhisperTranscript(rawTranscript) || rawTranscript.trim(),
        rawTranscript,
        modelName,
        modelRootPath
      });
    } catch (e: any) {
      try { fs.unlinkSync(audioPath); } catch {}
      const detail = e?.message || String(e);
      const ffmpegHint = detail.toLowerCase().includes('ffmpeg')
        ? ' Install FFmpeg and ensure it is available on PATH. Windows: scoop install ffmpeg, or download from https://ffmpeg.org/download.html'
        : '';
      res.status(500).json({
        error: 'Local transcription failed',
        detail: `${detail}${ffmpegHint}`,
        prerequisites: {
          ffmpeg: {
            macOS: 'brew install ffmpeg',
            linux: 'sudo apt install ffmpeg',
            windows: 'scoop install ffmpeg or download from https://ffmpeg.org/download.html'
          }
        }
      });
    }
  });

  // Terminal Endpoints
  app.get("/api/terminal/session", (req, res) => {
    const workspaceRoot = typeof req.query.workspaceRoot === 'string' && req.query.workspaceRoot.trim()
      ? req.query.workspaceRoot
      : process.cwd();
    const { id, session } = getTerminalSession();
    session.cwd = workspaceRoot;
    res.json({
      sessionId: id,
      cwd: session.cwd,
      currentPath: session.cwd,
      platform: process.platform,
      shell: process.platform === 'win32' ? 'powershell' : 'bash',
      hostname: os.hostname(),
      username: os.userInfo().username,
    });
  });

  app.post("/api/terminal/execute", async (req, res) => {
    let { command, currentPath, sessionId: clientSessionId, workspaceRoot } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ stderr: 'No command provided.' });
    }

    const hostWorkspaceRoot = path.resolve(workspaceRoot || currentPath || process.cwd());
    const { id: sessionId, session } = getTerminalSession(clientSessionId);

    if (currentPath && currentPath !== '.') {
      const resolved = path.resolve(currentPath);
      if (resolved === hostWorkspaceRoot || resolved.startsWith(hostWorkspaceRoot + path.sep)) {
        session.cwd = resolved;
      }
    }
    if (!(session.cwd === hostWorkspaceRoot || session.cwd.startsWith(hostWorkspaceRoot + path.sep))) {
      session.cwd = hostWorkspaceRoot;
    }

    const trimmed = command.trim();
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
    const isWin = process.platform === 'win32';
    const translatedCommand = isWin ? translateCommand(trimmed) : trimmed;

    if (['cls', 'clear', 'clear-host'].includes(firstWord)) {
      return res.json({ sessionId, clear: true, stdout: '', stderr: '' });
    }

    if (firstWord === 'cd') {
      const args = trimmed.slice(firstWord.length).trim();
      const nextPath = path.resolve(session.cwd, args || hostWorkspaceRoot);
      if (!(nextPath === hostWorkspaceRoot || nextPath.startsWith(hostWorkspaceRoot + path.sep))) {
        return res.status(403).json({ sessionId, stdout: '', stderr: `Permission denied: terminal is sandboxed to ${hostWorkspaceRoot}\n`, newPath: session.cwd });
      }
      session.cwd = nextPath;
      return res.json({ sessionId, stdout: '', stderr: '', newPath: session.cwd });
    }

    if (firstWord === 'pwd') {
      return res.json({ sessionId, stdout: session.cwd + '\n', stderr: '', newPath: session.cwd });
    }

    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      const proc = isWin
        ? spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', translatedCommand], {
            cwd: session.cwd,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
          })
        : spawn(translatedCommand, [], {
            cwd: session.cwd,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
          });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      proc.on('close', (code) => resolve({ stdout, stderr, exitCode: code ?? 0 }));
      proc.on('error', (error) => resolve({ stdout: '', stderr: `Execution failed: ${error.message}\n`, exitCode: 1 }));
    });
    return res.json({
      sessionId,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      newPath: session.cwd,
    });
  });

  // Search and scraping endpoints
  app.post("/api/search", async (req, res) => {
    const { query, tavilyKey, serpKey, provider: preferredProvider } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    let results: any[] = [];
    let provider = "duckduckgo";

    try {
      const tryTavily = async () => {
        if (!tavilyKey) return;
        try {
          const response = await axios.post('https://api.tavily.com/search', {
            api_key: tavilyKey,
            query: query,
            search_depth: "advanced",
            include_answer: true,
            include_raw_content: false
          });
          if (response.data && response.data.results) {
            results = response.data.results.map((r: any) => ({
              title: r.title,
              url: r.url,
              snippet: r.content
            }));
            provider = "tavily";
          }
        } catch (e) {
          console.log("Tavily failed, falling back...");
        }
      };

      const trySerpApi = async () => {
        if (!serpKey) return;
        try {
          const response = await axios.post('https://google.serper.dev/search', { q: query }, {
            headers: { 'X-API-KEY': serpKey, 'Content-Type': 'application/json' }
          });
          if (response.data && response.data.organic) {
            results = response.data.organic.map((r: any) => ({
              title: r.title,
              url: r.link,
              snippet: r.snippet
            }));
            provider = "serpapi";
          }
        } catch (e) {
          console.log("SerpAPI failed, falling back...");
        }
      };

      if (preferredProvider === "tavily") {
        await tryTavily();
        if (results.length === 0) await trySerpApi();
      } else if (preferredProvider === "serpapi") {
        await trySerpApi();
        if (results.length === 0) await tryTavily();
      } else {
        if (tavilyKey) await tryTavily();
        if (results.length === 0 && serpKey) await trySerpApi();
      }

      if (results.length === 0) {
        const ddg = await runDuckDuckGoSearch(query);
        results = ddg.results;
        provider = "duckduckgo";
      }

      res.json({ results, provider });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/image-search", async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    try {
      const ddgResults = await search(query, {
        region: 'wt-wt',
        safeSearch: -1,
        time: 'y',
        offset: 0
      });
      const images = (ddgResults.results || [])
        .map((r: any) => ({
          title: r.title,
          url: r.url,
          image: r.image
        }))
        .filter((r: any) => r.image || r.url);
      res.json({ images });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/scrape", async (req, res) => {
    const {
      url,
      selectors,
      extractLinks = true,
      extractImages = true,
      extractTables = false,
      outputFormat = 'markdown',
      strategy,
      mode,
      waitForSelector,
      useJavaScript,
      lightpanda
    } = req.body;

    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are supported.' });
      if (isPrivateHostname(parsedUrl.hostname)) return res.status(403).json({ error: 'Security Exception: Requests to local or private IP spaces are forbidden.' });
      if (selectors && typeof selectors === 'object' && containsSuspiciousSelector(selectors)) return res.status(400).json({ error: 'Security Exception: Suspicious selector payload detected.' });

      const scrapeTargetUrl = await resolveScrapeTargetUrl(url);
      const robotsCheck = await checkRobotsTxt(scrapeTargetUrl);
      const selectedStrategy: ScrapeStrategy =
        strategy || mode || (useJavaScript ? 'dynamic' : 'static');
      const lightpandaCloudConfig = lightpanda?.cloud;

      if (selectedStrategy === 'crawl') {
        const crawlResult = await scrapeWithCrawler(
          scrapeTargetUrl,
          !!useJavaScript,
          req.body.maxPages || 3,
          selectors,
          lightpandaCloudConfig
        );
        if (robotsCheck.warning) crawlResult.robotsWarning = robotsCheck.warning;
        return res.json(crawlResult);
      }

      const source: { html: string; statusCode: number; finalUrl: string; engineLabel?: string } =
        selectedStrategy === 'dynamic'
          ? await scrapeDynamicPage(scrapeTargetUrl, 'lightpanda', waitForSelector, lightpandaCloudConfig)
          : await scrapeStaticPage(scrapeTargetUrl);

      const result = buildScrapeResultFromHtml({
        html: source.html,
        effectiveUrl: source.finalUrl || scrapeTargetUrl,
        requestedUrl: url,
        statusCode: source.statusCode || 200,
        selectors,
        extractLinks,
        extractImages,
        extractTables,
        outputFormat,
        robotsWarning: robotsCheck.warning,
        strategy: selectedStrategy,
        engine: selectedStrategy === 'dynamic' ? (source.engineLabel || 'lightpanda-cloud') : 'axios+cheerio'
      });

      return res.json(result);
    } catch (e: any) {
      console.error('Operational error on server scrap request:', e);
      const msg = String(e?.message || 'Unknown scraping failure');
      if (msg.includes('not installed')) return res.status(501).json({ error: msg });
      if (e?.code === 'ECONNABORTED' || msg.toLowerCase().includes('timeout')) return res.status(504).json({ error: 'Timeout while scraping the target webpage.' });
      if (e?.response?.status) return res.status(e.response.status).json({ error: e.response?.data?.error || msg });
      return res.status(500).json({ error: `Server Scraping Failure: ${msg}` });
    }
  });

  // OS Info
  app.get("/api/os/gpu-info", async (req, res) => {
    try {
      const getGPUDetails = async () => {
        const results: { gpus: any[]; totalDedicatedVRAM_MB: number } = {
          gpus: [],
          totalDedicatedVRAM_MB: 0
        };

        const detectGPUType = (gpu: any) => {
          const model = (gpu.model || "").toLowerCase();
          const vendor = (gpu.vendor || "").toLowerCase();
          if (gpu.vramDynamic) return "Integrated (Shared VRAM)";
          if (model.includes("intel") || vendor.includes("intel")) return "Integrated";
          if (model.includes("radeon") && model.includes("graphics")) return "Integrated (APU)";
          return "Discrete";
        };

        try {
          const graphics = await si.graphics();
          if (graphics && graphics.controllers) {
            for (const gpu of graphics.controllers) {
              results.gpus.push({
                vendor: gpu.vendor,
                model: gpu.model,
                vramMB: gpu.vram,
                vramDynamic: gpu.vramDynamic,
                bus: gpu.bus,
                driverVersion: gpu.driverVersion,
                type: detectGPUType(gpu)
              });
            }
          }
        } catch (e) {
          console.error("si.graphics error:", e);
        }

        try {
          const raw = spawnSync(
            "nvidia-smi",
            ["--query-gpu=name,memory.total,memory.free,memory.used", "--format=csv,noheader,nounits"],
            { timeout: 5000, encoding: "utf8" }
          ).stdout?.trim();

          if (raw) {
            raw.split("\n").forEach((line) => {
              const [name, total, free, used] = line.split(",").map(s => s.trim());
              const existing = results.gpus.find(g =>
                g.model?.toLowerCase().includes(name?.toLowerCase().split(" ")[1])
              );
              const nvidiaData = {
                vendor: "NVIDIA",
                model: name,
                type: "Discrete",
                vramMB: parseInt(total, 10),
                source: "nvidia-smi"
              };
              if (existing) {
                Object.assign(existing, nvidiaData);
              } else {
                results.gpus.push(nvidiaData);
              }
            });
          }
        } catch {}

        results.totalDedicatedVRAM_MB = results.gpus
          .filter(g => g.type === "Discrete")
          .reduce((sum, g) => sum + (g.vramMB || 0), 0);

        return results;
      };

      const details = await getGPUDetails();
      let vramTotalBytes = 8192 * 1024 * 1024; // Default 8GB

      const discreteGPUs = details.gpus.filter(g => g.type === "Discrete" && g.vramMB);
      if (discreteGPUs.length > 0) {
        const bestGPU = discreteGPUs.reduce((prev, current) => {
          const prevVal = prev.vramMB || 0;
          const currVal = current.vramMB || 0;
          return prevVal > currVal ? prev : current;
        });
        vramTotalBytes = bestGPU.vramMB * 1024 * 1024;
      } else {
        const anyGPU = details.gpus.find(g => g.vramMB);
        if (anyGPU) {
          vramTotalBytes = anyGPU.vramMB * 1024 * 1024;
        } else if (process.platform === 'darwin') {
          vramTotalBytes = Math.floor(os.totalmem() * 0.6);
        } else {
          vramTotalBytes = Math.floor(os.totalmem() * 0.4);
        }
      }

      const vramTotalGB = vramTotalBytes / (1024 * 1024 * 1024);
      res.json({
        gpus: details.gpus,
        vramTotalBytes,
        vramTotalGB,
        detected: discreteGPUs.length > 0 || details.gpus.length > 0
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/os/info", (req, res) => {
    res.json({
      platform: process.platform,
      isWindows: process.platform === 'win32',
      isMac: process.platform === 'darwin',
      isLinux: process.platform === 'linux',
      shell: process.platform === 'win32' ? 'powershell' : '/bin/bash',
      hostname: os.hostname(),
    });
  });

  // Health check
  app.get("/api/health", async (req, res) => {
    res.json({
      status: 'ok',
      server: 'Lumina Web UI Server',
    });
  });

  // LSP endpoint
  app.post("/api/lsp/analyze", async (req, res) => {
    const { filePath, workspaceRoot } = req.body;
    if (!filePath) return res.status(400).json({ error: "filePath is required" });

    const resolvedPath = resolveCoderPath(filePath, workspaceRoot);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    try {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      const ext = path.extname(resolvedPath).toLowerCase();
      const lines = content.split(/\r?\n/);
      
      const imports: string[] = [];
      const symbols: Array<{ type: string; name: string; line: number }> = [];
      const diagnostics: Array<{ severity: 'error' | 'warning' | 'info'; message: string; line: number }> = [];

      lines.forEach((line, index) => {
        const importMatch = line.match(/^\s*(?:import|require)\s+.*?(?:from\s+)?['"](.*?)['"]/);
        if (importMatch) imports.push(importMatch[1]);

        const classMatch = line.match(/^\s*(?:export\s+)?class\s+(\w+)/);
        if (classMatch) symbols.push({ type: 'class', name: classMatch[1], line: index + 1 });

        const funcMatch = line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
        if (funcMatch) symbols.push({ type: 'function', name: funcMatch[1], line: index + 1 });

        const arrowMatch = line.match(/^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(.*?\)\s*=>/);
        if (arrowMatch) symbols.push({ type: 'arrow-function', name: arrowMatch[1], line: index + 1 });
      });

      const longLines = lines.map((l, i) => ({ line: i + 1, length: l.length })).filter(l => l.length > 200);
      longLines.forEach(ll => diagnostics.push({
        severity: 'warning',
        message: `Line ${ll.line} is ${ll.length} characters long (recommended max: 200)`,
        line: ll.line
      }));
      const tabLines = lines.map((l, i) => ({ line: i + 1, hasTabs: l.includes('\t') })).filter(l => l.hasTabs);
      tabLines.forEach(tl => diagnostics.push({
        severity: 'info',
        message: `Line ${tl.line} contains tab characters (consider using spaces)`,
        line: tl.line
      }));

      res.json({
        success: true,
        fileType: ext,
        lineCount: lines.length,
        imports: [...new Set(imports)],
        symbols,
        diagnostics,
        language: ext.replace('.', '')
      });
    } catch (e: any) {
      res.status(500).json({ error: "LSP analysis failed", detail: e.message });
    }
  });
}
