import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { TranslationUnit } from '@/types/json-tmx';

interface TMXPreviewProps {
  translationUnits: TranslationUnit[];
  sourceLanguage: string;
  targetLanguage: string;
}

export function TMXPreview({ translationUnits, sourceLanguage, targetLanguage }: TMXPreviewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUnits = useMemo(() => {
    if (!searchTerm.trim()) return translationUnits;
    
    const search = searchTerm.toLowerCase();
    return translationUnits.filter(unit => 
      unit.keyPath.toLowerCase().includes(search) ||
      unit.sourceText.toLowerCase().includes(search) ||
      unit.targetText.toLowerCase().includes(search) ||
      (unit.filePath && unit.filePath.toLowerCase().includes(search))
    );
  }, [translationUnits, searchTerm]);

  return (
    <Card className="p-6 bg-gradient-card shadow-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Translation Preview ({filteredUnits.length} units)
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search keys, source, or target..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Key Path</TableHead>
                <TableHead className="w-[250px]">{sourceLanguage.toUpperCase()}</TableHead>
                <TableHead className="w-[250px]">{targetLanguage.toUpperCase()}</TableHead>
                <TableHead className="w-[150px]">File</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No translations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUnits.map((unit, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">{unit.keyPath}</TableCell>
                    <TableCell className="text-sm">{unit.sourceText}</TableCell>
                    <TableCell className="text-sm">{unit.targetText}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {unit.filePath || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </Card>
  );
}
