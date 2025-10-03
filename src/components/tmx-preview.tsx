import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { TranslationUnit } from '@/types/json-tmx';
import { decodeHtmlEntities } from '@/utils/html-entities';
import { convertHtmlTagsToTmxInline, tmxInlineToPlaceholders } from '@/utils/html-tag-parser';

interface TMXPreviewProps {
  translationUnits: TranslationUnit[];
  sourceLanguage: string;
  targetLanguage: string;
}

export function TMXPreview({ translationUnits, sourceLanguage, targetLanguage }: TMXPreviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showPlaceholders, setShowPlaceholders] = useState(true);

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

  const formatText = (text: string) => {
    const decoded = decodeHtmlEntities(text);
    const withTmxTags = convertHtmlTagsToTmxInline(decoded);
    return showPlaceholders ? tmxInlineToPlaceholders(withTmxTags) : withTmxTags;
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Translation Preview ({filteredUnits.length} units)
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="placeholder-mode"
                checked={showPlaceholders}
                onCheckedChange={setShowPlaceholders}
              />
              <Label htmlFor="placeholder-mode" className="text-sm whitespace-nowrap">
                {showPlaceholders ? 'Placeholders {1}' : 'TMX Tags'}
              </Label>
            </div>
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
                    <TableCell className="font-mono text-xs">{decodeHtmlEntities(unit.keyPath)}</TableCell>
                    <TableCell className="font-mono text-xs">{formatText(unit.sourceText)}</TableCell>
                    <TableCell className="font-mono text-xs">{formatText(unit.targetText)}</TableCell>
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
