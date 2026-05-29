import { Artifact, Chat } from '../types';

export function getArtifactFilename(art: Artifact): string {
  if (art.title && /[\w\.-]+\.\w+/.test(art.title)) {
    return art.title.trim();
  }
  
  const firstLine = art.content.split('\n')[0] || '';
  const commentMatch = firstLine.match(/^(?:\/\*|<!--|\/\/)\s*(?:File:\s*)?([\w\.-]+\.\w+)\s*(?:\*\/|-->)?/i);
  if (commentMatch && commentMatch[1]) {
    return commentMatch[1].trim();
  }
  
  if (art.language === 'css') return 'style.css';
  if (['javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx'].includes(art.language)) return 'script.js';
  if (art.language === 'html' || art.type === 'html') return 'index.html';
  
  return '';
}

export function getCombinedSrcDoc(htmlContent: string, allArtifacts: Artifact[]): string {
  let doc = htmlContent;
  
  const artifactMap = new Map<string, Artifact>();
  allArtifacts.forEach(art => {
    const filename = getArtifactFilename(art);
    if (filename) {
      artifactMap.set(filename.toLowerCase(), art);
    }
  });

  const inlinedIds = new Set<string>();

  const linkRegex = /<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  doc = doc.replace(linkRegex, (match, href) => {
    const filename = href.split('/').pop()?.toLowerCase();
    if (filename && artifactMap.has(filename)) {
      const cssArt = artifactMap.get(filename)!;
      inlinedIds.add(cssArt.id);
      return `<style data-filename="${filename}">\n/* Inlined from ${filename} */\n${cssArt.content}\n</style>`;
    }
    return match;
  });

  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  doc = doc.replace(scriptRegex, (match, src) => {
    const filename = src.split('/').pop()?.toLowerCase();
    if (filename && artifactMap.has(filename)) {
      const jsArt = artifactMap.get(filename)!;
      inlinedIds.add(jsArt.id);
      return `<script data-filename="${filename}">\n// Inlined from ${filename}\n${jsArt.content}\n</script>`;
    }
    return match;
  });

  const leftoverCss: string[] = [];
  const leftoverJs: string[] = [];

  allArtifacts.forEach(art => {
    if (inlinedIds.has(art.id)) return;
    
    if (art.language === 'css') {
      leftoverCss.push(art.content);
      inlinedIds.add(art.id);
    } else if (['javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx'].includes(art.language)) {
      leftoverJs.push(art.content);
      inlinedIds.add(art.id);
    }
  });

  if (leftoverCss.length > 0) {
    const stylesBlock = leftoverCss.map(content => `<style>\n${content}\n</style>`).join('\n');
    if (doc.includes('</head>')) {
      doc = doc.replace('</head>', `${stylesBlock}\n</head>`);
    } else {
      doc = stylesBlock + '\n' + doc;
    }
  }

  if (leftoverJs.length > 0) {
    const scriptsBlock = leftoverJs.map(content => `<script>\n${content}\n</script>`).join('\n');
    if (doc.includes('</body>')) {
      doc = doc.replace('</body>', `${scriptsBlock}\n</body>`);
    } else {
      doc = doc + '\n' + scriptsBlock;
    }
  }

  return doc;
}

export function extractArtifacts(
  content: string,
  writingStyle: string,
  chats: Chat[],
  currentChatId: string | null
): Artifact[] {
  // Strip the <think>...</think> portion from the content analyzed for artifacts
  const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const artifacts: Artifact[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  const seenCode = new Set<string>();
  
  while ((match = codeBlockRegex.exec(cleanContent)) !== null) {
    const lang = (match[1] || 'text').toLowerCase();
    const code = match[2].trim();
    seenCode.add(code);
    
    let type: 'code' | 'markdown' | 'html' | 'poem' | 'report' = 'code';
    let title = 'Code Snippet';

    if (lang === 'html') {
      type = 'html';
      title = 'Web Preview';
    } else if (lang === 'markdown' || lang === 'md') {
      type = 'markdown';
      title = 'Document';
    } else if (lang === 'poem' || lang === 'poetry' || lang === 'verse') {
      type = 'poem';
      const lines = code.split('\n');
      const firstLine = lines[0].replace(/^#+\s*/, '').replace(/title/i, '').replace(/[:\-]/, '').trim();
      title = firstLine.length < 40 ? firstLine : 'Poetic Verse';
    } else if (lang === 'report' || lang === 'document' || lang === 'letter' || lang === 'memo') {
      type = 'report';
      const lines = code.split('\n');
      const firstLine = lines[0].replace(/^#+\s*/, '').replace(/title/i, '').replace(/[:\-]/, '').trim();
      title = firstLine.length < 40 ? firstLine : 'Professional Document';
    } else if (['javascript', 'typescript', 'tsx', 'jsx'].includes(lang)) {
      title = 'React Component';
    } else if (lang === 'python') {
      title = 'Python Script';
    } else if (lang === 'css') {
      title = 'Styles';
    }
    
    if (code.length > 30) {
      artifacts.push({
        id: 'art-' + Math.random().toString(36).substring(7),
        title,
        language: lang,
        content: code,
        type
      });
    }
  }

  // Heuristics fallback if no document, poem or report artifacts were detected
  if (artifacts.filter(a => ['poem', 'report', 'markdown'].includes(a.type)).length === 0) {
    const lowerContent = cleanContent.toLowerCase();
    const stanzas = cleanContent.split('\n\n').filter(s => s.trim().length > 0);
    
    // Get last user prompt to detect intent
    const currentChat = chats.find(c => c.id === currentChatId);
    const userMessages = currentChat ? currentChat.messages.filter(m => m.role === 'user') : [];
    const lastUserMessage = userMessages[userMessages.length - 1];
    const userPromptLower = lastUserMessage ? lastUserMessage.content.toLowerCase() : '';

    // Check current writing style first
    if (writingStyle === 'poem' && cleanContent.length > 30) {
      const lines = cleanContent.split('\n').map(l => l.trim()).filter(Boolean);
      const titleCand = lines[0]?.replace(/^#+\s*/, '') || 'A Beautiful Poem';
      artifacts.push({
        id: 'art-' + Math.random().toString(36).substring(7),
        title: titleCand.length < 40 ? titleCand : 'A Beautiful Poem',
        language: 'poetry',
        content: cleanContent,
        type: 'poem'
      });
    } else if (['letter', 'story', 'essay', 'script'].includes(writingStyle) && cleanContent.length > 30) {
      const lines = cleanContent.split('\n').map(l => l.trim()).filter(Boolean);
      const titleCand = lines[0]?.replace(/^#+\s*/, '') || (writingStyle.charAt(0).toUpperCase() + writingStyle.slice(1));
      artifacts.push({
        id: 'art-' + Math.random().toString(36).substring(7),
        title: titleCand.length < 40 ? titleCand : (writingStyle.charAt(0).toUpperCase() + writingStyle.slice(1)),
        language: 'markdown',
        content: cleanContent,
        type: 'report'
      });
    } else {
      // Fallback checks using keywords from either content or user prompt
      const poemKeywords = ['poem', 'poetry', 'sonnet', 'verse', 'haiku', 'rhyme', 'ode', 'ballad', 'stanzas', 'strophes'];
      const hasPoemIndicator = poemKeywords.some(kw => lowerContent.includes(kw)) || poemKeywords.some(kw => userPromptLower.includes(kw));
      
      const docKeywords = ['report', 'summary', 'executive', 'proposal', 'document', 'analysis', 'memo', 'letter', 'essay', 'story', 'script', 'paragraph'];
      const hasDocIndicator = docKeywords.some(kw => lowerContent.includes(kw)) || docKeywords.some(kw => userPromptLower.includes(kw));

      const hasShortRhythmicLines = stanzas.length >= 2 && stanzas.slice(0, 3).every(s => {
        const lines = s.split('\n').map(l => l.trim()).filter(Boolean);
        return lines.length >= 2 && lines.length <= 10 && lines.every(l => l.length < 90);
      });

      if (hasShortRhythmicLines && hasPoemIndicator && cleanContent.length < 5000) {
        const lines = cleanContent.split('\n').map(l => l.trim()).filter(Boolean);
        const titleCand = lines[0]?.replace(/^#+\s*/, '') || 'A Beautiful Poem';
        artifacts.push({
          id: 'art-' + Math.random().toString(36).substring(7),
          title: titleCand.length < 40 ? titleCand : 'A Beautiful Poem',
          language: 'poetry',
          content: cleanContent,
          type: 'poem'
        });
      }
      else if (hasDocIndicator && cleanContent.length > 300) {
        const lines = cleanContent.split('\n').map(l => l.trim()).filter(Boolean);
        const titleCand = lines[0]?.replace(/^#+\s*/, '') || 'Executive Document';
        artifacts.push({
          id: 'art-' + Math.random().toString(36).substring(7),
          title: titleCand.length < 40 ? titleCand : 'Executive Document',
          language: 'markdown',
          content: cleanContent,
          type: 'report'
        });
      }
    }
  }
  
  return artifacts;
}
