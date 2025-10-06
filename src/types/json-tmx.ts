export interface JsonFile {
  name: string;
  content: any;
  path?: string;
}

export interface TranslationUnit {
  sourceText: string;
  targetText: string;
  keyPath: string;
  filePath?: string;
  segmentIndex?: number;
  totalSegments?: number;
}

export interface AlignmentResult {
  translationUnits: TranslationUnit[];
  errors: string[];
  missingKeys: string[];
  processedFiles: number;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  progress: number;
  currentFile?: string;
  message?: string;
}

export interface LanguagePair {
  sourceLanguage: string;
  targetLanguage: string;
  sourceFiles: JsonFile[];
  targetFiles: JsonFile[];
}

export interface TMXExport {
  languagePair: LanguagePair;
  translationUnits: TranslationUnit[];
  errors: string[];
  missingKeys: string[];
}