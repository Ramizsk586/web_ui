/**
 * YouTube extraction and transcript helpers for Lumina.
 */

export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : null;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
  timeStr: string;
}

export interface YouTubeTranscriptResult {
  text: string;
  segments: TranscriptSegment[];
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export async function fetchYouTubeTranscript(videoId: string): Promise<YouTubeTranscriptResult> {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  });
  const html = await res.text();
  const captionTrackMatch = html.match(/"captionTracks":\[(\{.*?\})\]/);
  if (!captionTrackMatch) throw new Error('No captions available for this video.');
  
  const track = JSON.parse(captionTrackMatch[1].replace(/\\u0026/g, '&'));
  const captionUrl = track.baseUrl;
  const xmlRes = await fetch(captionUrl);
  const xml = await xmlRes.text();
  
  const matches = [...xml.matchAll(/<text([\s\S]*?)>([\s\S]*?)<\/text>/g)];
  if (matches.length === 0) {
    throw new Error('Could not parse any caption tracks in final XML.');
  }
  
  const segments: TranscriptSegment[] = [];
  const rawTextLines: string[] = [];
  
  for (const match of matches) {
    const attrs = match[1];
    const encodedText = match[2];
    
    const startMatch = attrs.match(/start="([\d.]+)"/);
    const durMatch = attrs.match(/dur="([\d.]+)"/);
    
    const start = startMatch ? parseFloat(startMatch[1]) : 0;
    const duration = durMatch ? parseFloat(durMatch[1]) : 0;
    
    const text = encodedText
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/<[^>]+>/g, '')
      .trim();
      
    if (text) {
      segments.push({
        text,
        start,
        duration,
        timeStr: formatTime(start)
      });
      rawTextLines.push(text);
    }
  }
  
  return {
    text: rawTextLines.join(' '),
    segments
  };
}
