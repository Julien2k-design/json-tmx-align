

## Updated Plan: Fix Segmentation for Numbered Lists and Text with Hidden Characters

### 1. Add robust text normalization (src/utils/json-parser.ts > segmentIntoSentences, lines 7-10)
**Before any processing:**
```typescript
// Normalize text: remove hidden characters and normalize whitespace
text = text
  .replace(/[\uFFFC\u200B\u200C\u200D\u2060\uFEFF]/g, '') // Remove object replacement & zero-width chars
  .replace(/[\u00A0\u202F]/g, ' ') // Convert non-breaking spaces to regular spaces
  .replace(/\s+/g, ' ') // Collapse multiple spaces
  .trim();
```

### 2. Detect numbered list items as segment boundaries (lines 27-29)
**Expand bullet detection to include numbered lists:**
```typescript
// Handle bullets AND numbered lists: insert sentinel before start-of-line markers
// Matches: "1.", "2.", etc. OR bullets (•, *, -, –, —)
processedText = processedText.replace(/(^|\r?\n)\s*(?:(\d+\.)|([•*\-–—]))\s+/g, '$1|||');
```

### 3. Add special handling for "colon before list" pattern (new, after line 29)
```typescript
// Special case: colon at end of line/text followed by numbered/bulleted list
// This handles cases like "Question:￼￼1. First item"
processedText = processedText.replace(/:\s*(^|\r?\n)\s*(?=(\d+\.)|([•*\-–—]))/g, ':|||$1');
```

### 4. Keep conservative sentence pattern (line 33)
**No change needed** - the existing pattern is correct:
```typescript
const sentencePattern = /(?:\u2026|\.{3}|[.!?])(?=\s|$|<|["')\]])/g;
```
This correctly avoids splitting on colons in the middle of sentences.

### 5. Keep lenient alignment in parseJsonFiles (lines 328-360)
**No change needed** - the existing logic handles mismatched segment counts appropriately.

### Expected Results

**English input:**
```
"During the past 7 days, how often have you been bothered by:￼￼2.￼ Your skin condition ￼burning ￼or￼ stinging￼￼￼￼"
```
**After normalization:**
```
"During the past 7 days, how often have you been bothered by: 2. Your skin condition burning or stinging"
```
**Segments:**
1. "During the past 7 days, how often have you been bothered by:"
2. "2. Your skin condition burning or stinging"

**Italian input:**
```
"Negli ultimi 7 giorni:￼￼2.￼ Quanto spesso Le ha dato fastidio la condizione di ￼bruciore ￼ o ￼pizzicore￼ alla pelle?￼￼￼"
```
**After normalization:**
```
"Negli ultimi 7 giorni: 2. Quanto spesso Le ha dato fastidio la condizione di bruciore o pizzicore alla pelle?"
```
**Segments:**
1. "Negli ultimi 7 giorni:"
2. "2. Quanto spesso Le ha dato fastidio la condizione di bruciore o pizzicore alla pelle?"

Both will have 2 segments → perfect alignment → clean TMX output.

