import { JsonFile, TranslationUnit } from '@/types/json-tmx';

export function parseJsonFiles(sourceFiles: JsonFile[], targetFiles: JsonFile[]): {
  translationUnits: TranslationUnit[];
  errors: string[];
  missingKeys: string[];
} {
  const translationUnits: TranslationUnit[] = [];
  const errors: string[] = [];
  const missingKeys: string[] = [];

  // Create a map of target files by name for quick lookup
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

function getBaseName(fileName: string): string {
  // Remove file extension and language codes (e.g., "menu.en.json" -> "menu", "menu_es.json" -> "menu")
  return fileName
    .replace(/\.(json|js)$/i, '')
    .replace(/[._-](en|es|fr|de|it|pt|ja|ko|zh|ru|ar)$/i, '');
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