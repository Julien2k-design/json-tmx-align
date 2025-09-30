import React, { useCallback, useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { JsonFile } from '@/types/json-tmx';

interface FileUploadProps {
  title: string;
  description: string;
  onFilesChange: (files: JsonFile[]) => void;
  files: JsonFile[];
  accept?: string;
}

export function FileUpload({ title, description, onFilesChange, files, accept = ".json" }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: JsonFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        try {
          const text = await file.text();
          const content = JSON.parse(text);
          newFiles.push({
            name: file.name,
            content,
            path: file.name,
          });
        } catch (error) {
          console.error(`Error parsing ${file.name}:`, error);
        }
      }
    }

    onFilesChange([...files, ...newFiles]);
  }, [files, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const removeFile = useCallback((index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  }, [files, onFilesChange]);

  return (
    <Card className="p-6 bg-gradient-card shadow-card">
      <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-primary bg-primary/5 shadow-glow'
            : 'border-border hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-4">
          Drag and drop JSON files here, or click to browse
        </p>
        <input
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
          id={`file-input-${title.replace(/\s+/g, '-').toLowerCase()}`}
        />
        <Button
          variant="outline"
          onClick={() => {
            const input = document.getElementById(`file-input-${title.replace(/\s+/g, '-').toLowerCase()}`) as HTMLInputElement;
            input?.click();
          }}
        >
          Browse Files
        </Button>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-foreground">
            {files.length} file{files.length === 1 ? '' : 's'} selected:
          </p>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted rounded-lg animate-slide-up"
            >
              <div className="flex items-center space-x-2">
                <File className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}