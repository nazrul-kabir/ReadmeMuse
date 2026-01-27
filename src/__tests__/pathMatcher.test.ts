import { shouldAnalyzePR, matchFiles } from '../utils/pathMatcher';

describe('pathMatcher', () => {
  describe('shouldAnalyzePR', () => {
    it('should return true when files match watch patterns', () => {
      const changedFiles = ['src/index.ts', 'lib/utils.js'];
      const watchPaths = ['src/**/*', 'lib/**/*'];
      
      expect(shouldAnalyzePR(changedFiles, watchPaths)).toBe(true);
    });

    it('should return false when no files match watch patterns', () => {
      const changedFiles = ['docs/README.md', 'tests/unit.test.js'];
      const watchPaths = ['src/**/*', 'lib/**/*'];
      
      expect(shouldAnalyzePR(changedFiles, watchPaths)).toBe(false);
    });

    it('should handle wildcard patterns correctly', () => {
      const changedFiles = ['config.js', 'src/app.ts'];
      const watchPaths = ['*.js', 'src/**/*'];
      
      expect(shouldAnalyzePR(changedFiles, watchPaths)).toBe(true);
    });
  });

  describe('matchFiles', () => {
    it('should return files matching patterns', () => {
      const files = ['README.md', 'docs/api.md', 'src/index.ts', 'docs/guide.md'];
      const patterns = ['*.md', 'docs/**/*.md'];
      
      const matched = matchFiles(files, patterns);
      
      expect(matched).toContain('README.md');
      expect(matched).toContain('docs/api.md');
      expect(matched).toContain('docs/guide.md');
      expect(matched).not.toContain('src/index.ts');
    });

    it('should return empty array when no files match', () => {
      const files = ['src/index.ts', 'lib/utils.js'];
      const patterns = ['*.md'];
      
      const matched = matchFiles(files, patterns);
      
      expect(matched).toEqual([]);
    });
  });
});
