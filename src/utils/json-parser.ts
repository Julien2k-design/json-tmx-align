import { JsonFile, TranslationUnit, LanguagePair } from '@/types/json-tmx';

export function detectLanguageFromJson(jsonContent: any): string | null {
  // Detect language from JSON content (language + locale fields)
  if (jsonContent.language && jsonContent.locale) {
    return `${jsonContent.language.toLowerCase()}-${jsonContent.locale.toUpperCase()}`;
  }
  return null;
}

export function detectLanguageForFile(file: JsonFile): { lang: string | null, origin: 'json' | 'filename' | 'both' | null } {
  const fromFilename = detectLanguageFromFilename(file.name);
  const fromJson = detectLanguageFromJson(file.content);
  
  console.debug(`[detectLanguageForFile] ${file.name}:`, { fromFilename, fromJson });
  
  // If both methods detect the same language
  if (fromFilename && fromJson && fromFilename === fromJson) {
    return { lang: fromFilename, origin: 'both' };
  }
  
  // Prefer the detection that includes a region (xx-YY format)
  const hasRegionFilename = fromFilename && /^[a-z]{2}-[A-Z]{2}$/.test(fromFilename);
  const hasRegionJson = fromJson && /^[a-z]{2}-[A-Z]{2}$/.test(fromJson);
  
  if (hasRegionFilename && !hasRegionJson) {
    return { lang: fromFilename, origin: 'filename' };
  }
  if (hasRegionJson && !hasRegionFilename) {
    return { lang: fromJson, origin: 'json' };
  }
  
  // If both have regions or both don't have regions, prefer filename
  if (fromFilename) {
    return { lang: fromFilename, origin: 'filename' };
  }
  if (fromJson) {
    return { lang: fromJson, origin: 'json' };
  }
  
  return { lang: null, origin: null };
}

export function detectLanguageFromFilename(filename: string): string | null {
  // Match patterns like: file_en-GB.json, file.en-US.json, file-es-ES.json
  const langMatch = filename.match(/[._-]([a-z]{2}(?:-[A-Z]{2})?)\.(json|js)$/i);
  if (langMatch) {
    // Normalize case: en-gb -> en-GB
    const lang = langMatch[1].toLowerCase();
    const parts = lang.split('-');
    if (parts.length === 2) {
      return `${parts[0]}-${parts[1].toUpperCase()}`;
    }
    return parts[0];
  }
  return null;
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

export function getBaseName(fileName: string): string {
  // Remove file extension and language codes
  return fileName
    .replace(/\.(json|js)$/i, '')
    .replace(/[._-][a-z]{2}(?:-[A-Z]{2})?$/i, '');
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

export function findLanguagePairs(files: JsonFile[]): LanguagePair[] {
  const pairs: LanguagePair[] = [];
  const sourceLangCodes = ['en-GB', 'en-US'];
  
  console.debug(`[findLanguagePairs] Processing ${files.length} files`);
  
  // Group files by base name
  const fileGroups = new Map<string, JsonFile[]>();
  files.forEach(file => {
    const baseName = getBaseName(file.name);
    if (!fileGroups.has(baseName)) {
      fileGroups.set(baseName, []);
    }
    fileGroups.get(baseName)!.push(file);
  });
  
  console.debug(`[findLanguagePairs] Found ${fileGroups.size} file groups:`, Array.from(fileGroups.keys()));
  
  // For each base group, find source and target files
  fileGroups.forEach((group, baseName) => {
    console.debug(`[findLanguagePairs] Processing group "${baseName}" with ${group.length} files`);
    
    let sourceFile: JsonFile | null = null;
    const targetFiles: JsonFile[] = [];
    
    group.forEach(file => {
      const { lang: langCode, origin } = detectLanguageForFile(file);
      console.debug(`[findLanguagePairs] File "${file.name}": detected language "${langCode}" (origin: ${origin})`);
      
      if (langCode && sourceLangCodes.includes(langCode)) {
        sourceFile = file;
        console.debug(`[findLanguagePairs] Set as source file: ${file.name} (${langCode})`);
      } else if (langCode) {
        targetFiles.push(file);
        console.debug(`[findLanguagePairs] Added as target file: ${file.name} (${langCode})`);
      }
    });
    
    if (sourceFile && targetFiles.length > 0) {
      console.debug(`[findLanguagePairs] Found source file for group "${baseName}": ${sourceFile.name} with ${targetFiles.length} target files`);
      
      targetFiles.forEach(targetFile => {
        const { lang: targetLang } = detectLanguageForFile(targetFile);
        const { lang: sourceLang } = detectLanguageForFile(sourceFile!);
        
        if (sourceLang && targetLang) {
          console.debug(`[findLanguagePairs] Creating language pair: ${sourceLang} → ${targetLang}`);
          pairs.push({
            sourceLanguage: sourceLang,
            targetLanguage: targetLang,
            sourceFiles: [sourceFile!],
            targetFiles: [targetFile]
          });
        }
      });
    } else {
      console.debug(`[findLanguagePairs] Group "${baseName}": sourceFile=${sourceFile?.name || 'null'}, targetFiles=${targetFiles.length}`);
    }
  });
  
  console.debug(`[findLanguagePairs] Final result: ${pairs.length} language pairs found`);
  pairs.forEach((pair, index) => {
    console.debug(`[findLanguagePairs] Pair ${index + 1}: ${pair.sourceLanguage} → ${pair.targetLanguage}`);
  });
  
  return pairs;
}

export function parseJsonFiles(sourceFiles: JsonFile[], targetFiles: JsonFile[]): {
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
      const baseName = getBaseName(sourceFile.name);
      
      // Find corresponding target file with same base name
      const targetFile = targetFiles.find(tf => getBaseName(tf.name) === baseName);
      
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
        
        translationUnits.push({
          sourceText,
          targetText,
          keyPath: key,
          filePath: sourceFile.name
        });
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