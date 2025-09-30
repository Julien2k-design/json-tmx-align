import { JsonFile, TranslationUnit, LanguagePair } from '@/types/json-tmx';

export function detectLanguageFromFilename(filename: string): string | null {
  // Match patterns like: file_en-GB.json, file.en-US.json, file-es-ES.json
  const langMatch = filename.match(/[._-]([a-z]{2}(?:-[A-Z]{2})?)\.(json|js)$/i);
  return langMatch ? langMatch[1].toLowerCase() : null;
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
    const language = detectLanguageFromFilename(file.name);
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
  const languageGroups = groupFilesByLanguage(files);
  const pairs: LanguagePair[] = [];
  
  // Find English source languages (en, en-gb, en-us)
  const englishLangs = Array.from(languageGroups.keys()).filter(lang => 
    lang.startsWith('en')
  );
  
  // Find target languages (non-English)
  const targetLangs = Array.from(languageGroups.keys()).filter(lang => 
    !lang.startsWith('en')
  );
  
  englishLangs.forEach(sourceLang => {
    targetLangs.forEach(targetLang => {
      const sourceFiles = languageGroups.get(sourceLang) || [];
      const targetFiles = languageGroups.get(targetLang) || [];
      
      if (sourceFiles.length > 0 && targetFiles.length > 0) {
        pairs.push({
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          sourceFiles,
          targetFiles
        });
      }
    });
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

  // Create a map of target files by base name for quick lookup
  const targetFileMap = new Map<string, JsonFile>();
  targetFiles.forEach(file => {
    const baseName = getBaseName(file.name);
    targetFileMap.set(baseName, file);
  });

  sourceFiles.forEach(sourceFile => {
    try {
      const baseName = getBaseName(sourceFile.name);
      const targetFile = targetFileMap.get(baseName);

      if (!targetFile) {
        errors.push(`No matching target file found for source: ${sourceFile.name}`);
        return;
      }

      const sourceJson = sourceFile.content;
      const targetJson = targetFile.content;

      const fileUnits = extractTranslationUnits(
        sourceJson,
        targetJson,
        '',
        sourceFile.name
      );

      translationUnits.push(...fileUnits.units);
      missingKeys.push(...fileUnits.missing);
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