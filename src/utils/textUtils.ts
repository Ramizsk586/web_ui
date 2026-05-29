/**
 * Text utility helper functions for Lumina.
 */

export function parseThinkTags(text: string) {
  const thinkStart = text ? text.indexOf('<think>') : -1;
  const thinkEnd = text ? text.indexOf('</think>') : -1;
  
  if (thinkStart === -1) {
    return {
      before: text || '',
      think: null,
      after: '',
      isThinking: false
    };
  }
  
  if (thinkEnd === -1) {
    return {
      before: text.slice(0, thinkStart),
      think: text.slice(thinkStart + 7),
      after: '',
      isThinking: true
    };
  }
  
  return {
    before: text.slice(0, thinkStart),
    think: text.slice(thinkStart + 7, thinkEnd),
    after: text.slice(thinkEnd + 8),
    isThinking: false
  };
}

/**
 * turboQuantCompress — Semantic context compression inspired by TurboQuant (arxiv 2504.19874).
 *
 * Applies a multi-pass rule-based compression to large text payloads:
 *   Pass 1: Strip HTML artifacts and navigation boilerplate
 *   Pass 2: Remove filler expressions and low-information phrases
 *   Pass 3: Deduplicate repeated sentence fragments
 *   Pass 4: Compress verbose sentence patterns to dense equivalents
 *   Pass 5: Hard token-budget enforcement with sentence-boundary truncation
 *
 * @param text        Raw input text (web scrape, wiki, search result, transcript, etc.)
 * @param maxChars    Maximum output character count (default 6000 — ~1500 tokens)
 * @param aggressiveness  'light' | 'medium' | 'aggressive' — how much to compress
 * @returns           Compressed text string
 */
export function turboQuantCompress(
  text: string,
  maxChars: number = 6000,
  aggressiveness: 'light' | 'medium' | 'aggressive' = 'medium'
): string {
  if (!text || text.length <= maxChars) return text;

  let t = text;

  // ── Pass 1: Strip HTML artifacts ──────────────────────────────────────────
  t = t.replace(/<script[\s\S]*?<\/script>/gi, '');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, '');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  t = t.replace(/https?:\/\/\S+/g, '[url]');

  // ── Pass 2: Remove navigation / boilerplate patterns ──────────────────────
  const boilerplatePatterns = [
    /\b(click here|read more|learn more|sign up|subscribe|cookie policy|privacy policy|terms of service|all rights reserved|copyright \d{4})\b/gi,
    /\b(skip to (main )?content|back to top|share this (article|page|post)|follow us on)\b/gi,
    /\b(advertisement|sponsored content|related articles?|you may also like|popular posts?)\b/gi,
    /\[?\s*(edit|citation needed|clarification needed|dubious|discuss)\s*\]?/gi,
  ];
  for (const pattern of boilerplatePatterns) {
    t = t.replace(pattern, '');
  }

  // ── Pass 3: Compress filler / verbose expressions ─────────────────────────
  if (aggressiveness === 'medium' || aggressiveness === 'aggressive') {
    const fillerPhrases: [RegExp, string][] = [
      [/\b(it is (important|worth noting|worth mentioning) (to note |that )?)/gi, ''],
      [/\b(it should be noted that )/gi, ''],
      [/\b(as (you )?can see,?\s?)/gi, ''],
      [/\b(in (other|simple) words,?\s?)/gi, ''],
      [/\b(generally speaking,?\s?)/gi, ''],
      [/\b(at the end of the day,?\s?)/gi, ''],
      [/\b(needless to say,?\s?)/gi, ''],
      [/\b(the (fact|truth) (is|of the matter) (that )?)/gi, ''],
      [/\b(due to the fact that )/gi, 'because '],
      [/\b(in order to )/gi, 'to '],
      [/\b(a (large|great|significant) number of )/gi, 'many '],
      [/\b(at this (point in time|moment in time),?\s?)/gi, 'now '],
      [/\b(on the other hand,?\s?)/gi, 'however, '],
      [/\b(with regard(s)? to )/gi, 'regarding '],
      [/\b(despite the fact that )/gi, 'although '],
      [/\b(in the event that )/gi, 'if '],
      [/\b(prior to )/gi, 'before '],
    ];
    for (const [pattern, replacement] of fillerPhrases) {
      t = t.replace(pattern, replacement);
    }
  }

  // ── Pass 4: Aggressive structural compression ─────────────────────────────
  if (aggressiveness === 'aggressive') {
    // Collapse enumerations of 3+ items into first two + "etc."
    t = t.replace(/(\w[\w\s]+),\s(\w[\w\s]+),\s(\w[\w\s]+),\s(\w[\w\s]+)(,\s\w[\w\s]+)*/g, '$1, $2, $3, etc.');
    // Remove parenthetical asides that are purely explanatory
    t = t.replace(/\s\([^)]{60,}\)/g, '');
  }

  // ── Pass 5: Collapse whitespace ───────────────────────────────────────────
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.trim();

  // ── Pass 6: Deduplicate repeated lines (exact and near-exact) ─────────────
  const lines = t.split('\n');
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const line of lines) {
    const key = line.trim().toLowerCase().slice(0, 80);
    if (key.length < 8 || !seen.has(key)) {
      seen.add(key);
      deduped.push(line);
    }
  }
  t = deduped.join('\n');

  // ── Pass 7: Hard budget enforcement at sentence boundaries ───────────────
  if (t.length > maxChars) {
    // Try to cut at a sentence boundary near the budget
    const cutPoint = t.lastIndexOf('.', maxChars);
    if (cutPoint > maxChars * 0.6) {
      t = t.slice(0, cutPoint + 1) + ' …[compressed by TurboQuant]';
    } else {
      t = t.slice(0, maxChars) + '…[compressed by TurboQuant]';
    }
  }

  return t;
}
