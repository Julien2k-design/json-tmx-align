import React, { useState, useCallback } from 'react';
import { FileUpload } from './file-upload';
import { ProcessingStatus } from './processing-status';
import { TMXPreview } from './tmx-preview';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Languages, RefreshCw, Building2, FileStack } from 'lucide-react';
import { JsonFile, TMXExport, ProcessingStatus as ProcessingStatusType, TranslationUnit } from '@/types/json-tmx';
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
  const [combinedMode, setCombinedMode] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<TMXExport | null>(null);
  
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
        
        const result = parseJsonFiles(pair.sourceFiles, pair.targetFiles, true);
        
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
        description: `Generated ${exports.length} TMX files with ${totalUnits} translation units (with sentence segmentation).`,
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
    if (combinedMode) {
      // Group by target language and download one combined TMX per target language
      const languageGroups = new Map<string, TMXExport[]>();
      
      tmxExports.forEach(exp => {
        const targetLang = exp.languagePair.targetLanguage;
        if (!languageGroups.has(targetLang)) {
          languageGroups.set(targetLang, []);
        }
        languageGroups.get(targetLang)!.push(exp);
      });
      
      if (languageGroups.size === 0) {
        toast({
          title: "No Data",
          description: "No translation units available for export.",
          variant: "destructive",
        });
        return;
      }
      
      let totalDownloads = 0;
      let totalUnits = 0;
      
      // Download one combined TMX per target language
      languageGroups.forEach((exports, targetLang) => {
        const allUnits = exports.flatMap(e => e.translationUnits);
        const sourceLang = exports[0].languagePair.sourceLanguage;
        
        const tmxContent = generateTMX(allUnits, sourceLang, targetLang);
        const filename = `translation_memory_combined_${sourceLang}_${targetLang}.tmx`;
        
        setTimeout(() => downloadTMX(tmxContent, filename), totalDownloads * 100);
        
        totalDownloads++;
        totalUnits += allUnits.length;
      });
      
      toast({
        title: "Combined TMX Files Downloaded",
        description: `Downloaded ${totalDownloads} combined TMX file(s) with ${totalUnits} total translation units.`,
      });
    } else {
      // Download individual TMX files
      tmxExports.forEach((tmxExport, index) => {
        setTimeout(() => downloadTmxFile(tmxExport), index * 100);
      });
    }
  }, [tmxExports, downloadTmxFile, combinedMode, toast]);

  const reset = useCallback(() => {
    setAllFiles([]);
    setTmxExports([]);
    setDetectedLanguages([]);
    setSelectedPreview(null);
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
          Automatically detect language pairs and transform JSON localization files into Translation Memory eXchange (TMX) format.
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

        {allFiles.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium text-foreground mb-2">Detection Summary:</h3>
            <ScrollArea className="h-[200px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Base Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allFiles.map((file, index) => {
                    const { lang, origin } = detectLanguageForFile(file);
                    const base = getBaseName(file.path || file.name);
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{file.path || file.name}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                            {lang || 'unknown'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{origin || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-xs">{base}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </Card>

      {/* Processing Actions */}
      <div className="flex flex-col items-center space-y-4">
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
              {combinedMode ? <FileStack className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {combinedMode ? 'Download Combined TMX' : 'Download All TMX'}
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
        
        {tmxExports.length > 0 && (
          <div className="flex items-center space-x-2 bg-secondary px-4 py-2 rounded-lg">
            <Switch
              id="combined-mode"
              checked={combinedMode}
              onCheckedChange={setCombinedMode}
            />
            <Label htmlFor="combined-mode" className="cursor-pointer">
              Combine files per target language
            </Label>
          </div>
        )}
      </div>

      {/* Preview Pane */}
      {selectedPreview && (
        <TMXPreview
          translationUnits={selectedPreview.translationUnits}
          sourceLanguage={selectedPreview.languagePair.sourceLanguage}
          targetLanguage={selectedPreview.languagePair.targetLanguage}
        />
      )}

      {/* TMX Export Results */}
      {tmxExports.length > 0 && (
        <Card className="p-6 bg-gradient-card shadow-card">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Generated TMX Files</h2>
          <div className="space-y-4">
            {tmxExports.map((tmxExport, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                <div className="flex-1">
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
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setSelectedPreview(tmxExport)}
                    variant={selectedPreview === tmxExport ? "default" : "outline"}
                    size="sm"
                  >
                    Preview
                  </Button>
                  <Button
                    onClick={() => downloadTmxFile(tmxExport)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
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