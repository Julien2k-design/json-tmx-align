import { JsonFile, TranslationUnit, LanguagePair } from '@/types/json-tmx';

/**
 * Segments text into sentences based on punctuation marks.
 * Handles edge cases like abbreviations, decimals, and HTML tags.
 */
export function segmentIntoSentences(text: string): string[] {
  if (!text || typeof text !== 'string') return [text];
  
  // Normalize text: remove hidden characters and normalize whitespace
  let normalizedText = text
    .replace(/[\uFFFC\u200B\u200C\u200D\u2060\uFEFF]/g, '') // Remove object replacement & zero-width chars
    .replace(/[\u00A0\u202F]/g, ' ') // Convert non-breaking spaces to regular spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
  
  if (!normalizedText) return [text];
  
  // Protect decimal numbers from being split (e.g., "1.2" should not split)
  let processedText = normalizedText.replace(/(\d)\.(\d)/g, '$1__DECIMAL_DOT__$2');
  
  // Common abbreviations that shouldn't trigger sentence breaks
  const abbreviations = ['Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Sr', 'Jr', 'Inc', 'Ltd', 'Co', 'Corp', 'etc', 'i.e', 'e.g', 'vs', 'U.S', 'U.K', 'A.M', 'P.M'];
  
  // Temporarily replace abbreviations with placeholders
  const abbrevMap = new Map<string, string>();
  abbreviations.forEach((abbrev, idx) => {
    const pattern = new RegExp(`\\b${abbrev}\\.`, 'gi');
    const placeholder = `__ABBREV_${idx}__`;
    processedText = processedText.replace(pattern, (match) => {
      abbrevMap.set(placeholder, match);
      return placeholder;
    });
  });
  
  // Handle bullets AND numbered lists: insert sentinel before start-of-line markers
  // Matches: "1.", "2.", etc. OR bullets (•, *, -, –, —)
  processedText = processedText.replace(/(^|\r?\n)\s*(?:(\d+\.)|([•*\-–—]))\s+/g, '$1|||');
  
  // Special case: colon followed by numbered/bulleted list (handles "Question: 1. First item")
  processedText = processedText.replace(/:\s+(?=\d+\.|[•*\-–—])/g, ':|||');
  
  // Conservative sentence pattern: only .!? and ellipsis, NOT colons
  // This prevents splitting on "Italian:" or similar constructs
  const sentencePattern = /(?:\u2026|\.{3}|[.!?])(?=\s|$|<|["')\]])/g;
  
  // Split on the bullet sentinel and sentence endings
  const segments: string[] = [];
  const parts = processedText.split('|||');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    // Split this part on sentence endings
    const sentences: string[] = [];
    let lastIndex = 0;
    let match;
    
    const regex = new RegExp(sentencePattern.source, sentencePattern.flags);
    while ((match = regex.exec(trimmed)) !== null) {
      const endIndex = match.index + match[0].length;
      const sentence = trimmed.substring(lastIndex, endIndex).trim();
      if (sentence) sentences.push(sentence);
      lastIndex = endIndex;
    }
    
    // Add remaining text
    if (lastIndex < trimmed.length) {
      const remaining = trimmed.substring(lastIndex).trim();
      if (remaining) sentences.push(remaining);
    }
    
    // If no sentence splits, add the whole part
    if (sentences.length === 0 && trimmed) {
      sentences.push(trimmed);
    }
    
    segments.push(...sentences);
  }
  
  // Restore abbreviations and decimal dots, strip leading bullet markers
  const restoredSegments = segments.map(segment => {
    let restored = segment;
    
    // Restore abbreviations
    abbrevMap.forEach((original, placeholder) => {
      restored = restored.replace(new RegExp(placeholder, 'g'), original);
    });
    
    // Restore decimal dots
    restored = restored.replace(/__DECIMAL_DOT__/g, '.');
    
    // Strip any leading bullet markers that might remain
    restored = restored.replace(/^[•*\-–—]\s+/, '');
    
    return restored.trim();
  }).filter(s => s.length > 0);
  
  // If no segments were created, return the original text
  return restoredSegments.length > 0 ? restoredSegments : [text];
}

export function detectLanguageFromJson(jsonContent: any): string | null {
  // Detect language from JSON content (language + locale fields)
  if (jsonContent.language && jsonContent.locale) {
    return `${jsonContent.language.toLowerCase()}-${jsonContent.locale.toUpperCase()}`;
  }
  return null;
}

export function detectLanguageForFile(file: JsonFile): { lang: string | null; origin: 'path' | 'json' | 'filename' | 'both' | null } {
  const fromPath = file.path ? detectLanguageFromPath(file.path) : null;
  const fromFilename = detectLanguageFromFilename(file.name);
  const fromJson = detectLanguageFromJson(file.content);

  const candidates: Array<{ lang: string; origin: 'path' | 'filename' | 'json' }> = [];
  if (fromPath) candidates.push({ lang: fromPath, origin: 'path' });
  if (fromFilename) candidates.push({ lang: fromFilename, origin: 'filename' });
  if (fromJson) candidates.push({ lang: fromJson, origin: 'json' });

  // Specificity: with region (xx-YY) = 2, plain (xx) = 1
  const specificity = (code: string) => (/^[a-z]{2}-[A-Z]{2}$/.test(code) ? 2 : /^[a-z]{2}$/.test(code) ? 1 : 0);

  // Choose by highest specificity, then origin priority: path > filename > json
  let best: { lang: string; origin: 'path' | 'filename' | 'json' } | null = null;
  for (const c of candidates) {
    if (!best) {
      best = c;
      continue;
    }
    const sBest = specificity(best.lang);
    const sC = specificity(c.lang);
    if (sC > sBest) {
      best = c;
      continue;
    }
    if (sC === sBest) {
      const priority: Record<'path' | 'filename' | 'json', number> = { path: 3, filename: 2, json: 1 };
      if (priority[c.origin] > priority[best.origin]) {
        best = c;
      }
    }
  }

  const origin: 'path' | 'filename' | 'json' | 'both' | null = best ? best.origin : null;
  console.debug(`[detectLanguageForFile] ${file.path || file.name}:`, { fromPath, fromFilename, fromJson, chosen: best?.lang, origin });

  return { lang: best?.lang || null, origin };
}

export function detectLanguageFromFilename(filename: string): string | null {
  // Try suffix near the extension: base_en-GB.json | base.en_US.json | base-fr.json
  const suffixRe = /[._-]([a-z]{2})(?:[-_]?([a-z]{2}))?\.(json|js)$/i;
  let m = filename.match(suffixRe);
  if (!m) {
    // Try prefix at the start: en-GB_home.json | fr.home.json | es-home.json
    const prefixRe = /^([a-z]{2})(?:[-_]?([a-z]{2}))?[._-]/i;
    m = filename.match(prefixRe);
  }
  if (m) {
    const lang = m[1].toLowerCase();
    const region = m[2];
    return region ? `${lang}-${region.toUpperCase()}` : lang;
  }
  return null;
}

export function detectLanguageFromPath(path: string): string | null {
  // Inspect folder segments, e.g., en-GB/... or es_US/...; prefer region-specific
  const segments = path.split(/[\\/]/);
  let best: string | null = null;
  for (const seg of segments) {
    const m = seg.match(/^([a-z]{2})(?:[-_]?([a-z]{2}))$/i) || seg.match(/^([a-z]{2})$/i);
    if (m) {
      const lang = m[1].toLowerCase();
      const region = (m as any)[2];
      const code = region ? `${lang}-${String(region).toUpperCase()}` : lang;
      // Prefer region-specific
      if (!best || (/^[a-z]{2}$/.test(best) && /^[a-z]{2}-[A-Z]{2}$/.test(code))) {
        best = code;
      }
    }
  }
  return best;
}

export function flattenJSON(obj: any, parentKey: string = ''): Record<string, string> {
  const items: Record<string, string> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key] !== null) {
        Object.assign(items, flattenJSON(obj[key], newKey));
      } else if (Array.isArray(obj[key])) {
        obj[key].forEach((item: any, idx: number) => {
          Object.assign(items, flattenJSON({[idx]: item}, newKey));
        });
      } else if (typeof obj[key] === 'string') {
        items[newKey] = obj[key];
      }
    }
  }
  
  return items;
}

export function getBaseName(pathOrName: string): string {
  // Normalize separators and remove language folders
  const parts = pathOrName.split(/[\\/]/).filter(Boolean);
  const isLangSeg = (s: string) => /^([a-z]{2})(?:[-_][A-Za-z]{2})?$/.test(s);
  const filtered = parts.filter((seg) => !isLangSeg(seg));
  const last = (filtered.length ? filtered : parts).slice(-1)[0] || '';
  // Remove extension
  let base = last.replace(/\.(json|js)$/i, '');
  // Remove leading or trailing language codes in the filename
  base = base.replace(/^([a-z]{2})(?:[-_][A-Za-z]{2})?[._-]+/i, '');
  base = base.replace(/[._-]+([a-z]{2})(?:[-_][A-Za-z]{2})?$/i, '');
  return base;
}

export function groupFilesByLanguage(files: JsonFile[]): Map<string, JsonFile[]> {
  const languageGroups = new Map<string, JsonFile[]>();
  
  files.forEach(file => {
    const { lang: language } = detectLanguageForFile(file);
    if (language) {
      if (!languageGroups.has(language)) {
        languageGroups.set(language, []);
      }
      languageGroups.get(language)!.push(file);
    }
  });
  
  return languageGroups;
}

export function findLanguagePairs(files: JsonFile[], specifiedSourceLang?: string): LanguagePair[] {
  const pairs: LanguagePair[] = [];
  
  // Build source language priority based on specified language
  const baseSourceLang = specifiedSourceLang?.split('-')[0] || 'en';
  const sourceLangPriority = specifiedSourceLang 
    ? [specifiedSourceLang, `${baseSourceLang}-GB`, `${baseSourceLang}-US`, baseSourceLang]
    : ['en-GB', 'en-US', 'en'];
  
  // Remove duplicates while preserving order
  const uniqueSourcePriority = [...new Set(sourceLangPriority)];

  console.debug(`[findLanguagePairs] Processing ${files.length} files with source priority:`, uniqueSourcePriority);

  // Group files by base name (normalized from path or name)
  const fileGroups = new Map<string, JsonFile[]>();
  files.forEach(file => {
    const baseName = getBaseName(file.path || file.name);
    if (!fileGroups.has(baseName)) {
      fileGroups.set(baseName, []);
    }
    fileGroups.get(baseName)!.push(file);
  });

  console.debug(`[findLanguagePairs] Found ${fileGroups.size} file groups:`, Array.from(fileGroups.keys()));

  // For each base group, find source and target files
  fileGroups.forEach((group, baseName) => {
    console.debug(`[findLanguagePairs] Processing group "${baseName}" with ${group.length} files`);

    // Pick the best source file based on priority order
    const sourceCandidates = group
      .map((f) => ({ f, det: detectLanguageForFile(f) }))
      .filter((x) => x.det.lang && x.det.lang.startsWith(baseSourceLang));

    let sourceFile: JsonFile | null = null;
    for (const pref of uniqueSourcePriority) {
      const found = sourceCandidates.find((x) => x.det.lang === pref);
      if (found) {
        sourceFile = found.f;
        console.debug(`[findLanguagePairs] Selected source ${found.f.name} (${found.det.lang}, origin=${found.det.origin})`);
        break;
      }
    }

    const targetFiles: JsonFile[] = [];
    group.forEach(file => {
      const { lang: langCode, origin } = detectLanguageForFile(file);
      // Target files are those that don't match the source language base
      if (file !== sourceFile && langCode && !langCode.startsWith(baseSourceLang)) {
        targetFiles.push(file);
        console.debug(`[findLanguagePairs] Added target: ${file.name} (${langCode}, origin=${origin})`);
      }
    });

    if (sourceFile && targetFiles.length > 0) {
      targetFiles.forEach(targetFile => {
        const { lang: targetLang } = detectLanguageForFile(targetFile);
        const { lang: sourceLang } = detectLanguageForFile(sourceFile!);
        if (sourceLang && targetLang) {
          console.debug(`[findLanguagePairs] Creating pair: ${sourceLang} → ${targetLang} for base "${baseName}"`);
          pairs.push({
            sourceLanguage: sourceLang,
            targetLanguage: targetLang,
            sourceFiles: [sourceFile!],
            targetFiles: [targetFile]
          });
        }
      });
    } else {
      const reasons = !sourceFile
        ? `no ${baseSourceLang} source found among: ${group.map(g => `${g.name}(${detectLanguageForFile(g).lang || 'n/a'})`).join(', ')}`
        : `have source but ${targetFiles.length} targets`;
      console.debug(`[findLanguagePairs] Skipping group "${baseName}": ${reasons}`);
    }
  });

  console.debug(`[findLanguagePairs] Final result: ${pairs.length} language pairs found`);
  pairs.forEach((pair, index) => {
    console.debug(`[findLanguagePairs] Pair ${index + 1}: ${pair.sourceLanguage} → ${pair.targetLanguage}`);
  });

  return pairs;
}

export function parseJsonFiles(
  sourceFiles: JsonFile[], 
  targetFiles: JsonFile[], 
  enableSegmentation: boolean = false
): {
  translationUnits: TranslationUnit[];
  errors: string[];
  missingKeys: string[];
} {
  const translationUnits: TranslationUnit[] = [];
  const errors: string[] = [];
  const missingKeys: string[] = [];

  if (sourceFiles.length === 0) {
    errors.push('No source files provided');
    return { translationUnits, errors, missingKeys };
  }

  sourceFiles.forEach(sourceFile => {
    try {
      const baseName = getBaseName(sourceFile.path || sourceFile.name);
      // Find corresponding target file with same base name
      const targetFile = targetFiles.find(tf => getBaseName(tf.path || tf.name) === baseName);
      if (!targetFile) {
        errors.push(`No corresponding target file found for ${sourceFile.name}`);
        return;
      }

      // Flatten both source and target JSON
      const sourceFlat = flattenJSON(sourceFile.content);
      const targetFlat = flattenJSON(targetFile.content);
      
      // Create translation units from flattened data
      Object.entries(sourceFlat).forEach(([key, sourceText]) => {
        const targetText = targetFlat[key] || '';
        
        if (!targetText) {
          missingKeys.push(`Missing target for key "${key}" in ${targetFile.name}`);
        }
        
        // Apply sentence segmentation if enabled
        if (enableSegmentation && sourceText.length > 0) {
          const sourceSegments = segmentIntoSentences(sourceText);
          const targetSegments = targetText ? segmentIntoSentences(targetText) : [];
          
          // Only segment if both source and target are non-empty AND segment counts match
          if (targetText && sourceSegments.length === targetSegments.length && sourceSegments.length > 1) {
            // Counts match - create per-segment TUs
            for (let i = 0; i < sourceSegments.length; i++) {
              translationUnits.push({
                sourceText: sourceSegments[i],
                targetText: targetSegments[i],
                keyPath: key,
                filePath: sourceFile.name,
                segmentIndex: i + 1,
                totalSegments: sourceSegments.length
              });
            }
          } else if (targetText && sourceSegments.length !== targetSegments.length && sourceSegments.length > 1) {
            // Mismatch - fall back to unsegmented
            console.warn(
              `Segmentation mismatch for key "${key}" in ${sourceFile.name} ` +
              `(source=${sourceSegments.length}, target=${targetSegments.length}). Fallback to unsegmented.`
            );
            translationUnits.push({
              sourceText,
              targetText,
              keyPath: key,
              filePath: sourceFile.name
            });
          } else {
            // Single segment or no target - create single TU
            translationUnits.push({
              sourceText,
              targetText,
              keyPath: key,
              filePath: sourceFile.name
            });
          }
        } else {
          // No segmentation - create single TU
          translationUnits.push({
            sourceText,
            targetText,
            keyPath: key,
            filePath: sourceFile.name
          });
        }
      });
      
    } catch (error) {
      errors.push(`Error processing ${sourceFile.name}: ${error}`);
    }
  });

  return { translationUnits, errors, missingKeys };
}


function extractTranslationUnits(
  source: any,
  target: any,
  keyPath: string,
  filePath: string
): { units: TranslationUnit[]; missing: string[] } {
  const units: TranslationUnit[] = [];
  const missing: string[] = [];

  if (typeof source !== 'object' || source === null) {
    return { units, missing };
  }

  Object.keys(source).forEach(key => {
    const currentKeyPath = keyPath ? `${keyPath}.${key}` : key;
    const sourceValue = source[key];
    const targetValue = target?.[key];

    if (typeof sourceValue === 'string') {
      if (typeof targetValue === 'string') {
        units.push({
          sourceText: sourceValue,
          targetText: targetValue,
          keyPath: currentKeyPath,
          filePath,
        });
      } else {
        missing.push(`Missing target for key: ${currentKeyPath} in ${filePath}`);
      }
    } else if (typeof sourceValue === 'object' && sourceValue !== null) {
      if (Array.isArray(sourceValue)) {
        // Handle arrays
        sourceValue.forEach((item, index) => {
          if (typeof item === 'string') {
            const targetItem = targetValue?.[index];
            if (typeof targetItem === 'string') {
              units.push({
                sourceText: item,
                targetText: targetItem,
                keyPath: `${currentKeyPath}[${index}]`,
                filePath,
              });
            } else {
              missing.push(`Missing target for array item: ${currentKeyPath}[${index}] in ${filePath}`);
            }
          }
        });
      } else {
        // Handle nested objects
        const nestedResult = extractTranslationUnits(
          sourceValue,
          targetValue,
          currentKeyPath,
          filePath
        );
        units.push(...nestedResult.units);
        missing.push(...nestedResult.missing);
      }
    }
  });

  return { units, missing };
}