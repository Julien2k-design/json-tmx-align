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
    // Decode HTML entities first, then escape XML special characters
    const decodeHtmlEntities = (text: string) => {
      const entityMap: { [key: string]: string } = {
        'agrave': 'à', 'aacute': 'á', 'acirc': 'â', 'atilde': 'ã', 'auml': 'ä', 'aring': 'å',
        'Agrave': 'À', 'Aacute': 'Á', 'Acirc': 'Â', 'Atilde': 'Ã', 'Auml': 'Ä', 'Aring': 'Å',
        'ccedil': 'ç', 'Ccedil': 'Ç',
        'egrave': 'è', 'eacute': 'é', 'ecirc': 'ê', 'euml': 'ë',
        'Egrave': 'È', 'Eacute': 'É', 'Ecirc': 'Ê', 'Euml': 'Ë',
        'igrave': 'ì', 'iacute': 'í', 'icirc': 'î', 'iuml': 'ï',
        'Igrave': 'Ì', 'Iacute': 'Í', 'Icirc': 'Î', 'Iuml': 'Ï',
        'ograve': 'ò', 'oacute': 'ó', 'ocirc': 'ô', 'otilde': 'õ', 'ouml': 'ö',
        'Ograve': 'Ò', 'Oacute': 'Ó', 'Ocirc': 'Ô', 'Otilde': 'Õ', 'Ouml': 'Ö',
        'ugrave': 'ù', 'uacute': 'ú', 'ucirc': 'û', 'uuml': 'ü',
        'Ugrave': 'Ù', 'Uacute': 'Ú', 'Ucirc': 'Û', 'Uuml': 'Ü',
        'yacute': 'ý', 'yuml': 'ÿ', 'Yacute': 'Ý',
        'nbsp': '\u00A0', 'iexcl': '¡', 'iquest': '¿',
        'laquo': '«', 'raquo': '»', 'quot': '"', 'apos': "'",
        'amp': '&', 'lt': '<', 'gt': '>',
        'hellip': '…', 'ndash': '–', 'mdash': '—',
        'copy': '©', 'reg': '®', 'trade': '™',
        'euro': '€', 'pound': '£', 'yen': '¥', 'cent': '¢'
      };
      
      return text
        // Decode named entities
        .replace(/&([a-zA-Z]+);/g, (match, entity) => entityMap[entity] || match)
        // Decode numeric entities (decimal)
        .replace(/&#(\d+);/g, (match, dec) => String.fromCodePoint(parseInt(dec, 10)))
        // Decode numeric entities (hexadecimal)
        .replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => String.fromCodePoint(parseInt(hex, 16)));
    };
    
    const escapeXml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const processText = (text: string) => escapeXml(decodeHtmlEntities(text));

    return `
    <tu tuid="${generateTUID(tu)}">
      <note>${processText(tu.keyPath)}${tu.filePath ? ` (${tu.filePath})` : ''}</note>
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
  const combined = `${tu.keyPath}_${tu.sourceText}`;
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