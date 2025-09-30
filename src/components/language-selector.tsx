import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface LanguageSelectorProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  languages: { code: string; name: string }[];
}

export function LanguageSelector({ label, value, onValueChange, languages }: LanguageSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name} ({lang.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}