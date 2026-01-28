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
  ]
};
