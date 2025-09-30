import React, { useState, useCallback } from 'react';
import { FileUpload } from './file-upload';
import { LanguageSelector } from './language-selector';
import { ProcessingStatus } from './processing-status';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Languages, RefreshCw } from 'lucide-react';
import { JsonFile, AlignmentResult, ProcessingStatus as ProcessingStatusType } from '@/types/json-tmx';
import { parseJsonFiles } from '@/utils/json-parser';
import { generateTMX, downloadTMX } from '@/utils/tmx-generator';
import { useToast } from '@/hooks/use-toast';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
];

export function JsonTmxConverter() {
  const [sourceFiles, setSourceFiles] = useState<JsonFile[]>([]);
  const [targetFiles, setTargetFiles] = useState<JsonFile[]>([]);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [alignmentResult, setAlignmentResult] = useState<AlignmentResult | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatusType>({
    isProcessing: false,
    progress: 0,
  });
  
  const { toast } = useToast();

  const processFiles = useCallback(async () => {
    if (sourceFiles.length === 0 || targetFiles.length === 0) {
      toast({
        title: "Missing Files",
        description: "Please upload both source and target JSON files.",
        variant: "destructive",
      });
      return;
    }

    setProcessingStatus({
      isProcessing: true,
      progress: 0,
      message: "Starting alignment process...",
    });

    // Simulate processing with progress updates
    const totalFiles = sourceFiles.length;
    let processedFiles = 0;

    try {
      for (let i = 0; i < sourceFiles.length; i++) {
        setProcessingStatus({
          isProcessing: true,
          progress: (i / totalFiles) * 100,
          currentFile: sourceFiles[i].name,
          message: `Processing ${sourceFiles[i].name}...`,
        });
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 200));
        processedFiles++;
      }

      setProcessingStatus({
        isProcessing: true,
        progress: 95,
        message: "Generating alignment results...",
      });

      const result = parseJsonFiles(sourceFiles, targetFiles);
      
      setAlignmentResult({
        ...result,
        processedFiles,
      });

      setProcessingStatus({
        isProcessing: false,
        progress: 100,
        message: "Processing complete!",
      });

      toast({
        title: "Processing Complete",
        description: `Generated ${result.translationUnits.length} translation units.`,
      });

    } catch (error) {
      setProcessingStatus({
        isProcessing: false,
        progress: 0,
      });
      
      toast({
        title: "Processing Error",
        description: "An error occurred while processing the files.",
        variant: "destructive",
      });
    }
  }, [sourceFiles, targetFiles, toast]);

  const downloadTmxFile = useCallback(() => {
    if (!alignmentResult || alignmentResult.translationUnits.length === 0) {
      toast({
        title: "No Data",
        description: "No translation units available for export.",
        variant: "destructive",
      });
      return;
    }

    const tmxContent = generateTMX(
      alignmentResult.translationUnits,
      sourceLanguage,
      targetLanguage
    );

    const filename = `translation_memory_${sourceLanguage}_${targetLanguage}.tmx`;
    downloadTMX(tmxContent, filename);

    toast({
      title: "TMX Downloaded",
      description: `Downloaded ${filename} with ${alignmentResult.translationUnits.length} translation units.`,
    });
  }, [alignmentResult, sourceLanguage, targetLanguage, toast]);

  const reset = useCallback(() => {
    setSourceFiles([]);
    setTargetFiles([]);
    setAlignmentResult(null);
    setProcessingStatus({
      isProcessing: false,
      progress: 0,
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Languages className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            JSON to TMX Converter
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Transform your JSON localization files into Translation Memory eXchange (TMX) format 
          for seamless integration with CAT tools like SDL Trados, MemoQ, and Memsource.
        </p>
      </div>

      {/* Language Configuration */}
      <Card className="p-6 bg-gradient-card shadow-card">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Language Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LanguageSelector
            label="Source Language"
            value={sourceLanguage}
            onValueChange={setSourceLanguage}
            languages={SUPPORTED_LANGUAGES}
          />
          <LanguageSelector
            label="Target Language"
            value={targetLanguage}
            onValueChange={setTargetLanguage}
            languages={SUPPORTED_LANGUAGES.filter(lang => lang.code !== sourceLanguage)}
          />
        </div>
      </Card>

      {/* File Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <FileUpload
          title="Source Files"
          description="Upload your source language JSON files (e.g., English)"
          onFilesChange={setSourceFiles}
          files={sourceFiles}
        />
        <FileUpload
          title="Target Files"
          description="Upload your target language JSON files (e.g., Spanish, French, etc.)"
          onFilesChange={setTargetFiles}
          files={targetFiles}
        />
      </div>

      {/* Processing Actions */}
      <div className="flex justify-center space-x-4">
        <Button
          onClick={processFiles}
          disabled={sourceFiles.length === 0 || targetFiles.length === 0 || processingStatus.isProcessing}
          variant="hero"
          size="lg"
        >
          {processingStatus.isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Languages className="w-4 h-4" />
              Align & Process
            </>
          )}
        </Button>
        
        {alignmentResult && (
          <Button
            onClick={downloadTmxFile}
            disabled={!alignmentResult || alignmentResult.translationUnits.length === 0}
            variant="success"
            size="lg"
          >
            <Download className="w-4 h-4" />
            Download TMX
          </Button>
        )}
        
        <Button
          onClick={reset}
          variant="outline"
          size="lg"
          disabled={processingStatus.isProcessing}
        >
          Reset
        </Button>
      </div>

      {/* Processing Status */}
      <ProcessingStatus
        status={processingStatus}
        translationUnits={alignmentResult?.translationUnits.length || 0}
        errors={alignmentResult?.errors || []}
      />
    </div>
  );
}