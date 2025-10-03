/**
 * Converts HTML tags in text to TMX inline elements
 * - Paired tags (e.g., <b>text</b>) → <bpt> + <ept>
 * - Self-closing tags (e.g., <br/>) → <ph>
 * - Standalone tags (e.g., <br>) → <ph>
 */

interface TagInfo {
  type: 'paired-start' | 'paired-end' | 'self-closing' | 'standalone';
  fullTag: string;
  tagName: string;
  index: number;
  pairId?: number;
}

export function convertHtmlTagsToTmxInline(text: string): string {
  const tags: TagInfo[] = [];
  let tagIdCounter = 1;
  const tagStack: { tagName: string; id: number; startIndex: number }[] = [];

  // Regex to match HTML tags
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*\/?>/g;
  let match;

  // First pass: identify all tags and their types
  while ((match = tagRegex.exec(text)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    const isSelfClosing = fullTag.endsWith('/>');
    const isClosing = fullTag.startsWith('</');

    if (isSelfClosing) {
      // Self-closing tag like <br/>
      tags.push({
        type: 'self-closing',
        fullTag,
        tagName,
        index: match.index,
        pairId: tagIdCounter++
      });
    } else if (isClosing) {
      // Closing tag like </b>
      // Find matching opening tag from stack
      const matchingIndex = tagStack.findIndex(t => t.tagName === tagName);
      if (matchingIndex !== -1) {
        const opening = tagStack.splice(matchingIndex, 1)[0];
        tags.push({
          type: 'paired-end',
          fullTag,
          tagName,
          index: match.index,
          pairId: opening.id
        });
      } else {
        // Orphaned closing tag - treat as standalone
        tags.push({
          type: 'standalone',
          fullTag,
          tagName,
          index: match.index,
          pairId: tagIdCounter++
        });
      }
    } else {
      // Opening tag like <b> or <div>
      // Check if it's a standalone tag (br, hr, img without /)
      const standaloneTagNames = ['br', 'hr', 'img', 'input', 'meta', 'link'];
      if (standaloneTagNames.includes(tagName.toLowerCase())) {
        tags.push({
          type: 'standalone',
          fullTag,
          tagName,
          index: match.index,
          pairId: tagIdCounter++
        });
      } else {
        // Paired opening tag
        const pairId = tagIdCounter++;
        tagStack.push({ tagName, id: pairId, startIndex: match.index });
        tags.push({
          type: 'paired-start',
          fullTag,
          tagName,
          index: match.index,
          pairId
        });
      }
    }
  }

  // Handle unclosed tags in stack as standalone
  while (tagStack.length > 0) {
    const unclosed = tagStack.pop()!;
    const tagInfo = tags.find(t => t.index === unclosed.startIndex);
    if (tagInfo) {
      tagInfo.type = 'standalone';
    }
  }

  // Second pass: replace tags with TMX inline elements (from end to start to preserve indices)
  tags.sort((a, b) => b.index - a.index);

  let result = text;
  for (const tag of tags) {
    const escapedTag = escapeXmlContent(tag.fullTag);
    let tmxInline = '';

    switch (tag.type) {
      case 'paired-start':
        tmxInline = `<bpt i="${tag.pairId}">${escapedTag}</bpt>`;
        break;
      case 'paired-end':
        tmxInline = `<ept i="${tag.pairId}">${escapedTag}</ept>`;
        break;
      case 'self-closing':
      case 'standalone':
        tmxInline = `<ph i="${tag.pairId}">${escapedTag}</ph>`;
        break;
    }

    result = result.substring(0, tag.index) + tmxInline + result.substring(tag.index + tag.fullTag.length);
  }

  return result;
}

/**
 * Escapes XML special characters (for content inside TMX inline tags)
 */
function escapeXmlContent(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escapes XML special characters but preserves TMX inline tags
 */
export function escapeXmlExceptTmxTags(text: string): string {
  // Temporarily replace TMX tags with placeholders
  const tmxTags: string[] = [];
  const placeholder = '___TMX_TAG_';
  
  let result = text.replace(/<(bpt|ept|ph)([^>]*)>.*?<\/(bpt|ept|ph)>/g, (match) => {
    tmxTags.push(match);
    return `${placeholder}${tmxTags.length - 1}___`;
  });

  // Escape XML characters in the remaining text
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // Restore TMX tags
  result = result.replace(new RegExp(`${placeholder}(\\d+)___`, 'g'), (_, index) => {
    return tmxTags[parseInt(index)];
  });

  return result;
}

/**
 * Converts TMX inline tags to user-friendly placeholder notation
 * Example: <bpt i="1">&lt;b&gt;</bpt>text<ept i="1">&lt;/b&gt;</ept> → {1}text{/1}
 */
export function tmxInlineToPlaceholders(text: string): string {
  return text
    .replace(/<bpt i="(\d+)">[^<]*<\/bpt>/g, '{$1}')
    .replace(/<ept i="(\d+)">[^<]*<\/ept>/g, '{/$1}')
    .replace(/<ph i="(\d+)">[^<]*<\/ph>/g, '{$1}');
}
