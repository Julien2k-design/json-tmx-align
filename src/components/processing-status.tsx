import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { ProcessingStatus as ProcessingStatusType } from '@/types/json-tmx';

interface ProcessingStatusProps {
  status: ProcessingStatusType;
  translationUnits: number;
  errors: string[];
}

export function ProcessingStatus({ status, translationUnits, errors }: ProcessingStatusProps) {
  if (!status.isProcessing && translationUnits === 0 && errors.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 bg-gradient-card shadow-card animate-slide-up">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          {status.isProcessing ? (
            <FileText className="w-5 h-5 text-primary animate-pulse-glow" />
          ) : errors.length > 0 ? (
            <AlertCircle className="w-5 h-5 text-destructive" />
          ) : (
            <CheckCircle className="w-5 h-5 text-success" />
          )}
          <h3 className="text-lg font-semibold text-foreground">
            {status.isProcessing ? 'Processing Files...' : 'Processing Complete'}
          </h3>
        </div>

        {status.isProcessing && (
          <div className="space-y-2">
            <Progress value={status.progress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {status.message || `Processing: ${status.currentFile || 'Unknown file'}`}
            </p>
          </div>
        )}

        {!status.isProcessing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Translation Units</p>
              <p className="text-2xl font-bold text-success">{translationUnits}</p>
            </div>
            {errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Errors</p>
                <p className="text-2xl font-bold text-destructive">{errors.length}</p>
              </div>
            )}
          </div>
        )}

        {errors.length > 0 && !status.isProcessing && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Error Details:</p>
            <div className="bg-destructive/10 rounded-lg p-3 max-h-32 overflow-y-auto">
              {errors.map((error, index) => (
                <p key={index} className="text-xs text-destructive mb-1">
                  {error}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}