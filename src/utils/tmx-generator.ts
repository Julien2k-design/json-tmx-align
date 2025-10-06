import { TranslationUnit } from '@/types/json-tmx';
import { decodeHtmlEntities } from './html-entities';
import { convertHtmlTagsToTmxInline, escapeXmlExceptTmxTags } from './html-tag-parser';

export function generateTMX(
  translationUnits: TranslationUnit[],
  sourceLanguage: string = 'en',
  targetLanguage: string = 'es'
): string {
  const tmxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<tmx version="1.4">
  <header
    creationtool="JSON to TMX Converter"
    creationtoolversion="1.0"
    segtype="sentence"
    o-tmf="json"
    adminlang="en"
    srclang="${sourceLanguage}"
    datatype="plaintext">
  </header>
  <body>`;

  const tmxFooter = `
  </body>
</tmx>`;

  const translationUnitElements = translationUnits.map(tu => {
    const processText = (text: string) => {
      // Step 1: Decode HTML entities (e.g., &eacute; → é)
      const decoded = decodeHtmlEntities(text);
      
      // Step 2: Convert HTML tags to TMX inline elements (e.g., <b> → <bpt>)
      const withInlineTags = convertHtmlTagsToTmxInline(decoded);
      
      // Step 3: Escape remaining XML characters (but preserve TMX tags)
      return escapeXmlExceptTmxTags(withInlineTags);
    };

    const noteText = tu.segmentIndex 
      ? `${tu.keyPath} (seg ${tu.segmentIndex}/${tu.totalSegments})${tu.filePath ? ` - ${tu.filePath}` : ''}`
      : `${tu.keyPath}${tu.filePath ? ` (${tu.filePath})` : ''}`;
    
    return `
    <tu tuid="${generateTUID(tu)}">
      <note>${processText(noteText)}</note>
      <tuv xml:lang="${sourceLanguage}">
        <seg>${processText(tu.sourceText)}</seg>
      </tuv>
      <tuv xml:lang="${targetLanguage}">
        <seg>${processText(tu.targetText)}</seg>
      </tuv>
    </tu>`;
  }).join('');

  return tmxHeader + translationUnitElements + tmxFooter;
}

function generateTUID(tu: TranslationUnit): string {
  // Generate a unique ID for the translation unit (Unicode-safe)
  const combined = tu.segmentIndex 
    ? `${tu.keyPath}_${tu.segmentIndex}_${tu.sourceText}`
    : `${tu.keyPath}_${tu.sourceText}`;
  const base64 = utf8ToBase64(combined);
  return base64.replace(/[+=\/]/g, '').substring(0, 16);
}

function utf8ToBase64(str: string): string {
  // Use TextEncoder to handle Unicode characters safely
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function downloadTMX(tmxContent: string, filename: string = 'translation_memory.tmx'): void {
  const blob = new Blob([tmxContent], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}