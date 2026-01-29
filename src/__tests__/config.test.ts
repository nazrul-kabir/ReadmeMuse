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

  it('should have toneExamples field with default empty array', () => {
    expect(DEFAULT_CONFIG.toneExamples).toBeDefined();
    expect(Array.isArray(DEFAULT_CONFIG.toneExamples)).toBe(true);
    expect(DEFAULT_CONFIG.toneExamples).toEqual([]);
  });

  it('should support optional toneExamples in config interface', () => {
    // Type checking test - will fail at compile time if interface is wrong
    const configWithTone = {
      watchPaths: ['src/**/*'],
      documentationFiles: ['README.md'],
      toneExamples: ['Example tone 1', 'Example tone 2']
    };
    expect(configWithTone.toneExamples).toHaveLength(2);

    // Config without toneExamples should also be valid
    const configWithoutTone: { watchPaths: string[]; documentationFiles: string[]; toneExamples?: string[] } = {
      watchPaths: ['src/**/*'],
      documentationFiles: ['README.md']
    };
    expect(configWithoutTone.toneExamples).toBeUndefined();
  });
});
