import { TranslationUnit } from '@/types/json-tmx';

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
    // Escape XML special characters and encode non-breaking spaces
    const escapeXml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/\u00A0/g, '&nbsp;'); // Non-breaking space
    };

    return `
    <tu tuid="${generateTUID(tu)}">
      <note>${escapeXml(tu.keyPath)}${tu.filePath ? ` (${tu.filePath})` : ''}</note>
      <tuv xml:lang="${sourceLanguage}">
        <seg>${escapeXml(tu.sourceText)}</seg>
      </tuv>
      <tuv xml:lang="${targetLanguage}">
        <seg>${escapeXml(tu.targetText)}</seg>
      </tuv>
    </tu>`;
  }).join('');

  return tmxHeader + translationUnitElements + tmxFooter;
}

function generateTUID(tu: TranslationUnit): string {
  // Generate a unique ID for the translation unit
  const combined = `${tu.keyPath}_${tu.sourceText}`;
  return btoa(combined).replace(/[+=\/]/g, '').substring(0, 16);
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