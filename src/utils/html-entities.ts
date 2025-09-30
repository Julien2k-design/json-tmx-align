// Comprehensive HTML entity decoder with iterative decoding support
// Handles single and double-encoded entities

const HTML_ENTITY_MAP: { [key: string]: string } = {
  // Latin letters with accents
  'agrave': 'à', 'aacute': 'á', 'acirc': 'â', 'atilde': 'ã', 'auml': 'ä', 'aring': 'å',
  'Agrave': 'À', 'Aacute': 'Á', 'Acirc': 'Â', 'Atilde': 'Ã', 'Auml': 'Ä', 'Aring': 'Å',
  'ccedil': 'ç', 'Ccedil': 'Ç',
  'egrave': 'è', 'eacute': 'é', 'ecirc': 'ê', 'euml': 'ë',
  'Egrave': 'È', 'Eacute': 'É', 'Ecirc': 'Ê', 'Euml': 'Ë',
  'igrave': 'ì', 'iacute': 'í', 'icirc': 'î', 'iuml': 'ï',
  'Igrave': 'Ì', 'Iacute': 'Í', 'Icirc': 'Î', 'Iuml': 'Ï',
  'ograve': 'ò', 'oacute': 'ó', 'ocirc': 'ô', 'otilde': 'õ', 'ouml': 'ö', 'oslash': 'ø',
  'Ograve': 'Ò', 'Oacute': 'Ó', 'Ocirc': 'Ô', 'Otilde': 'Õ', 'Ouml': 'Ö', 'Oslash': 'Ø',
  'ugrave': 'ù', 'uacute': 'ú', 'ucirc': 'û', 'uuml': 'ü',
  'Ugrave': 'Ù', 'Uacute': 'Ú', 'Ucirc': 'Û', 'Uuml': 'Ü',
  'yacute': 'ý', 'yuml': 'ÿ', 'Yacute': 'Ý',
  'ntilde': 'ñ', 'Ntilde': 'Ñ',
  'aelig': 'æ', 'AElig': 'Æ',
  'szlig': 'ß',
  'thorn': 'þ', 'THORN': 'Þ',
  'eth': 'ð', 'ETH': 'Ð',
  
  // Quotation marks and apostrophes
  'lsquo': '\u2018', 'rsquo': '\u2019', 'sbquo': '\u201A',
  'ldquo': '\u201C', 'rdquo': '\u201D', 'bdquo': '\u201E',
  'quot': '"', 'apos': "'",
  'lsaquo': '\u2039', 'rsaquo': '\u203A',
  'laquo': '«', 'raquo': '»',
  
  // Punctuation
  'nbsp': '\u00A0', 'iexcl': '¡', 'iquest': '¿',
  'hellip': '…', 'ndash': '–', 'mdash': '—',
  'bull': '•', 'middot': '·',
  'dagger': '†', 'Dagger': '‡',
  'permil': '‰',
  'prime': '′', 'Prime': '″',
  
  // Symbols
  'copy': '©', 'reg': '®', 'trade': '™',
  'euro': '€', 'pound': '£', 'yen': '¥', 'cent': '¢',
  'curren': '¤', 'fnof': 'ƒ',
  'sect': '§', 'para': '¶',
  'deg': '°', 'plusmn': '±',
  'times': '×', 'divide': '÷',
  'frac14': '¼', 'frac12': '½', 'frac34': '¾',
  'sup1': '¹', 'sup2': '²', 'sup3': '³',
  'micro': 'µ',
  
  // XML special characters
  'amp': '&', 'lt': '<', 'gt': '>',
  
  // Math and Greek
  'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ', 'epsilon': 'ε',
  'Alpha': 'Α', 'Beta': 'Β', 'Gamma': 'Γ', 'Delta': 'Δ', 'Epsilon': 'Ε',
  'infin': '∞', 'sum': '∑', 'minus': '−', 'radic': '√',
  'ne': '≠', 'equiv': '≡', 'le': '≤', 'ge': '≥',
};

/**
 * Decodes HTML entities in text, including double-encoded entities.
 * Performs multiple passes (up to maxIterations) to handle cases like &amp;rsquo; → &rsquo; → '
 * 
 * @param text - Text containing HTML entities
 * @param maxIterations - Maximum number of decoding passes (default: 5)
 * @returns Decoded text with all HTML entities converted to Unicode characters
 */
export function decodeHtmlEntities(text: string, maxIterations: number = 5): string {
  if (!text) return text;
  
  let result = text;
  let previousResult = '';
  let iteration = 0;
  
  // Keep decoding until no more entities are found or max iterations reached
  while (result !== previousResult && iteration < maxIterations) {
    previousResult = result;
    
    result = result
      // Decode named entities
      .replace(/&([a-zA-Z]+);/g, (match, entity) => HTML_ENTITY_MAP[entity] || match)
      // Decode numeric entities (decimal) - e.g., &#233; → é
      .replace(/&#(\d+);/g, (match, dec) => {
        const code = parseInt(dec, 10);
        return code > 0 ? String.fromCodePoint(code) : match;
      })
      // Decode numeric entities (hexadecimal) - e.g., &#xE9; → é
      .replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
        const code = parseInt(hex, 16);
        return code > 0 ? String.fromCodePoint(code) : match;
      });
    
    iteration++;
  }
  
  return result;
}
