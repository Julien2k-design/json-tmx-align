import React, { useState, useCallback } from 'react';
import { FileUpload } from './file-upload';
import { ProcessingStatus } from './processing-status';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Languages, RefreshCw, Building2 } from 'lucide-react';
import { JsonFile, TMXExport, ProcessingStatus as ProcessingStatusType } from '@/types/json-tmx';
import { findLanguagePairs, parseJsonFiles, detectLanguageForFile, getBaseName } from '@/utils/json-parser';
import { generateTMX, downloadTMX } from '@/utils/tmx-generator';
import { useToast } from '@/hooks/use-toast';

export function JsonTmxConverter() {
  const [allFiles, setAllFiles] = useState<JsonFile[]>([]);
  const [tmxExports, setTmxExports] = useState<TMXExport[]>([]);
  const [detectedLanguages, setDetectedLanguages] = useState<string[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatusType>({
    isProcessing: false,
    progress: 0,
  });
  
  const { toast } = useToast();

  const handleFilesChange = useCallback((files: JsonFile[]) => {
    setAllFiles(files);
    
    // Detect languages from uploaded files using consistent detection logic
    const languages = Array.from(new Set(
      files.map(file => {
        const { lang } = detectLanguageForFile(file);
        return lang;
      }).filter(Boolean)
    )) as string[];
    
    setDetectedLanguages(languages);
    console.debug('[handleFilesChange] Detected languages:', languages);
  }, []);

  const processFiles = useCallback(async () => {
    if (allFiles.length === 0) {
      toast({
        title: "Missing Files",
        description: "Please upload JSON files to process.",
        variant: "destructive",
      });
      return;
    }

    setProcessingStatus({
      isProcessing: true,
      progress: 0,
      message: "Detecting language pairs...",
    });

    try {
      const languagePairs = findLanguagePairs(allFiles);
      
      if (languagePairs.length === 0) {
        toast({
          title: "No Language Pairs Found",
          description: "Could not detect English source files and target language files.",
          variant: "destructive",
        });
        setProcessingStatus({ isProcessing: false, progress: 0 });
        return;
      }

      const exports: TMXExport[] = [];
      const totalPairs = languagePairs.length;

      for (let i = 0; i < languagePairs.length; i++) {
        const pair = languagePairs[i];
        
        setProcessingStatus({
          isProcessing: true,
          progress: (i / totalPairs) * 90,
          message: `Processing ${pair.sourceLanguage} → ${pair.targetLanguage}...`,
        });
        
        const result = parseJsonFiles(pair.sourceFiles, pair.targetFiles);
        
        exports.push({
          languagePair: pair,
          ...result
        });
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setTmxExports(exports);

      setProcessingStatus({
        isProcessing: false,
        progress: 100,
        message: "Processing complete!",
      });

      const totalUnits = exports.reduce((sum, exp) => sum + exp.translationUnits.length, 0);
      
      toast({
        title: "Processing Complete",
        description: `Generated ${exports.length} TMX files with ${totalUnits} translation units total.`,
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
  }, [allFiles, toast]);

  const downloadTmxFile = useCallback((tmxExport: TMXExport) => {
    if (tmxExport.translationUnits.length === 0) {
      toast({
        title: "No Data",
        description: "No translation units available for export.",
        variant: "destructive",
      });
      return;
    }

    const tmxContent = generateTMX(
      tmxExport.translationUnits,
      tmxExport.languagePair.sourceLanguage,
      tmxExport.languagePair.targetLanguage
    );

    const filename = `translation_memory_${tmxExport.languagePair.sourceLanguage}_${tmxExport.languagePair.targetLanguage}.tmx`;
    downloadTMX(tmxContent, filename);

    toast({
      title: "TMX Downloaded",
      description: `Downloaded ${filename} with ${tmxExport.translationUnits.length} translation units.`,
    });
  }, [toast]);

  const downloadAllTmxFiles = useCallback(() => {
    tmxExports.forEach(tmxExport => {
      setTimeout(() => downloadTmxFile(tmxExport), 100);
    });
  }, [tmxExports, downloadTmxFile]);

  const reset = useCallback(() => {
    setAllFiles([]);
    setTmxExports([]);
    setDetectedLanguages([]);
    setProcessingStatus({
      isProcessing: false,
      progress: 0,
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-icon rounded-lg">
            <Building2 className="w-6 h-6 text-white" />
            <span className="text-white font-semibold">ICON plc</span>
          </div>
          <Languages className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          JSON to TMX Converter
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Automatically detect language pairs and transform JSON localization files into Translation Memory eXchange (TMX) format 
          for seamless integration with CAT tools like SDL Trados, MemoQ, and Memsource.
        </p>
      </div>

      {/* File Upload */}
      <Card className="p-6 bg-gradient-card shadow-card">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Upload JSON Files</h2>
        <p className="text-muted-foreground mb-4">
          Upload all your JSON files at once. The tool will automatically detect languages from filenames (e.g., menu_en-GB.json, menu_es-ES.json) 
          and match source files with their target language counterparts.
        </p>
        <FileUpload
          title="All JSON Files"
          description="Upload all source and target JSON files together"
          onFilesChange={handleFilesChange}
          files={allFiles}
        />
        
        {detectedLanguages.length > 0 && (
          <div className="mt-4 p-3 bg-secondary rounded-lg">
            <h3 className="font-medium text-foreground mb-2">Detected Languages:</h3>
            <div className="flex flex-wrap gap-2">
              {detectedLanguages.map(lang => (
                <span key={lang} className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Processing Actions */}
      <div className="flex justify-center space-x-4">
        <Button
          onClick={processFiles}
          disabled={allFiles.length === 0 || processingStatus.isProcessing}
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
              Auto-Detect & Process
            </>
          )}
        </Button>
        
        {tmxExports.length > 0 && (
          <Button
            onClick={downloadAllTmxFiles}
            variant="success"
            size="lg"
          >
            <Download className="w-4 h-4" />
            Download All TMX
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

      {/* TMX Export Results */}
      {tmxExports.length > 0 && (
        <Card className="p-6 bg-gradient-card shadow-card">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Generated TMX Files</h2>
          <div className="space-y-4">
            {tmxExports.map((tmxExport, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div>
                  <h3 className="font-medium text-foreground">
                    {tmxExport.languagePair.sourceLanguage.toUpperCase()} → {tmxExport.languagePair.targetLanguage.toUpperCase()}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {tmxExport.translationUnits.length} translation units
                    {tmxExport.errors.length > 0 && (
                      <span className="text-destructive ml-2">• {tmxExport.errors.length} errors</span>
                    )}
                  </p>
                </div>
                <Button
                  onClick={() => downloadTmxFile(tmxExport)}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Processing Status */}
      <ProcessingStatus
        status={processingStatus}
        translationUnits={tmxExports.reduce((sum, exp) => sum + exp.translationUnits.length, 0)}
        errors={tmxExports.flatMap(exp => exp.errors)}
      />
    </div>
  );
}