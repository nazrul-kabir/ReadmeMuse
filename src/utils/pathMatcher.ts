import { minimatch } from "minimatch";

/**
 * Check if PR should be analyzed based on changed files and watch patterns
 */
export function shouldAnalyzePR(changedFiles: string[], watchPaths: string[]): boolean {
  return changedFiles.some(file => 
    watchPaths.some(pattern => minimatch(file, pattern))
  );
}

/**
 * Match files against patterns
 */
export function matchFiles(files: string[], patterns: string[]): string[] {
  return files.filter(file =>
    patterns.some(pattern => minimatch(file, pattern))
  );
}
