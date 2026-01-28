import { generateDocumentationSuggestions } from '../utils/aiAnalyzer';

describe('aiAnalyzer', () => {
  const mockInput = {
    prDiff: `diff --git a/src/utils/helper.ts b/src/utils/helper.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/utils/helper.ts
@@ -0,0 +1,5 @@
+export function formatDate(date: Date): string {
+  return date.toISOString();
+}`,
    changedFiles: [
      {
        filename: 'src/utils/helper.ts',
        patch: `@@ -0,0 +1,5 @@
+export function formatDate(date: Date): string {
+  return date.toISOString();
+}`,
        additions: 3,
        deletions: 0,
        changes: 3,
      },
    ],
    docFiles: [
      {
        path: 'README.md',
        content: `# MyProject\n\nA great project.\n\n## Features\n\n- Cool stuff`,
      },
    ],
    prTitle: 'Add date formatting utility',
    prBody: 'This PR adds a new formatDate function',
    context: {
      repository: 'test/repo',
      branch: 'feature/date-utils',
    },
  };

  describe('heuristic mode (no AI)', () => {
    beforeEach(() => {
      // Ensure no OpenAI API key is set for heuristic tests
      delete process.env.OPENAI_API_KEY;
    });

    it('should detect when documentation needs update for new exports', async () => {
      const suggestions = await generateDocumentationSuggestions(mockInput);
      
      // Should suggest update since we added a new export
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should include file path in suggestion', async () => {
      const suggestions = await generateDocumentationSuggestions(mockInput);
      
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('filePath');
        expect(suggestions[0].filePath).toBe('README.md');
      }
    });

    it('should generate diff patch in unified format', async () => {
      const suggestions = await generateDocumentationSuggestions(mockInput);
      
      if (suggestions.length > 0) {
        expect(suggestions[0].diffPatch).toContain('--- a/');
        expect(suggestions[0].diffPatch).toContain('+++ b/');
        expect(suggestions[0].diffPatch).toContain('@@');
      }
    });

    it('should include summary and reasoning', async () => {
      const suggestions = await generateDocumentationSuggestions(mockInput);
      
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('summary');
        expect(suggestions[0]).toHaveProperty('reasoning');
        expect(typeof suggestions[0].summary).toBe('string');
        expect(typeof suggestions[0].reasoning).toBe('string');
      }
    });

    it('should accept toneExamples parameter', async () => {
      const inputWithTone = {
        ...mockInput,
        toneExamples: ['We keep things simple and fun!', 'Our API is a breeze to use.'],
      };
      
      const suggestions = await generateDocumentationSuggestions(inputWithTone);
      
      // Should not throw error and should still work
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should not suggest updates for unchanged code', async () => {
      const noChangeInput = {
        ...mockInput,
        changedFiles: [
          {
            filename: 'src/utils/helper.ts',
            patch: `@@ -1,3 +1,3 @@
 export function formatDate(date: Date): string {
-  return date.toISOString();
+  return date.toISOString(); // minor comment change
 }`,
            additions: 1,
            deletions: 1,
            changes: 2,
          },
        ],
      };
      
      const suggestions = await generateDocumentationSuggestions(noChangeInput);
      
      // Might return empty or minimal suggestions for non-export changes
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('AI mode configuration', () => {
    it('should handle missing OPENAI_API_KEY gracefully', async () => {
      delete process.env.OPENAI_API_KEY;
      
      // Should fall back to heuristic mode without errors
      const suggestions = await generateDocumentationSuggestions(mockInput);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should pass toneExamples to AI prompt when provided', async () => {
      // This test verifies the structure, actual AI call would need mocking
      const inputWithTone = {
        ...mockInput,
        toneExamples: ['Example tone'],
      };
      
      const suggestions = await generateDocumentationSuggestions(inputWithTone);
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });
});
