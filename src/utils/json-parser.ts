import { JsonFile, TranslationUnit, LanguagePair } from '@/types/json-tmx';

export function detectLanguageFromJson(jsonContent: any): string | null {
  // Detect language from JSON content (language + locale fields)
  if (jsonContent.language && jsonContent.locale) {
    return `${jsonContent.language.toLowerCase()}-${jsonContent.locale.toUpperCase()}`;
  }
  return null;
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
    // Try filename detection first (more reliable), then JSON content
    const language = detectLanguageFromFilename(file.name) || detectLanguageFromJson(file.content);
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
  
  // Group files by base name
  const fileGroups = new Map<string, JsonFile[]>();
  files.forEach(file => {
    const baseName = getBaseName(file.name);
    if (!fileGroups.has(baseName)) {
      fileGroups.set(baseName, []);
    }
    fileGroups.get(baseName)!.push(file);
  });
  
  // For each base group, find source and target files
  fileGroups.forEach((group, baseName) => {
    let sourceFile: JsonFile | null = null;
    const targetFiles: JsonFile[] = [];
    
    group.forEach(file => {
      // Try filename detection first, then JSON content
      const langCode = detectLanguageFromFilename(file.name) || detectLanguageFromJson(file.content);
      if (langCode && sourceLangCodes.includes(langCode)) {
        sourceFile = file;
      } else if (langCode) {
        targetFiles.push(file);
      }
    });
    
    if (sourceFile && targetFiles.length > 0) {
      targetFiles.forEach(targetFile => {
        const targetLang = detectLanguageFromFilename(targetFile.name) || detectLanguageFromJson(targetFile.content);
        const sourceLang = detectLanguageFromFilename(sourceFile!.name) || detectLanguageFromJson(sourceFile!.content);
        
        if (sourceLang && targetLang) {
          pairs.push({
            sourceLanguage: sourceLang,
            targetLanguage: targetLang,
            sourceFiles: [sourceFile!],
            targetFiles: [targetFile]
          });
        }
      });
    }
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