/**
 * Configuration for ReadmeMuse watchlist
 */
export interface ReadmeMuseConfig {
  /**
   * List of file patterns to watch for changes
   * When these files change, documentation updates will be suggested
   */
  watchPaths: string[];
  
  /**
   * List of documentation files to analyze for updates
   */
  documentationFiles: string[];
  
  /**
   * Optional array of tone examples to guide AI-generated documentation
   * These examples help the AI match the repository's unique voice and style
   */
  toneExamples?: string[];
  
  /**
   * Optional: Enable draft PR creation instead of posting comments
   * When true, creates a branch and draft PR with applied documentation changes
   * When false (default), posts suggestions as PR comments
   */
  createDraftPR?: boolean;
}

/**
 * Default configuration if no config file is found
 */
export const DEFAULT_CONFIG: ReadmeMuseConfig = {
  watchPaths: [
    "src/**/*",
    "lib/**/*",
    "api/**/*"
  ],
  documentationFiles: [
    "README.md",
    "docs/**/*.md"
  ],
  toneExamples: [],
  createDraftPR: false
};
