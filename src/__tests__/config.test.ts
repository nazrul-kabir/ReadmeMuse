import { DEFAULT_CONFIG } from '../types/config';

describe('config', () => {
  it('should have default watch paths', () => {
    expect(DEFAULT_CONFIG.watchPaths).toBeDefined();
    expect(DEFAULT_CONFIG.watchPaths.length).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.watchPaths).toContain('src/**/*');
  });

  it('should have default documentation files', () => {
    expect(DEFAULT_CONFIG.documentationFiles).toBeDefined();
    expect(DEFAULT_CONFIG.documentationFiles.length).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.documentationFiles).toContain('README.md');
  });
});
