/**
 * Documentation suggestion with diff patch
 */
export interface DocSuggestion {
  /**
   * Documentation file path
   */
  filePath: string;
  
  /**
   * Suggested changes as a unified diff
   */
  diffPatch: string;
  
  /**
   * Summary of suggested changes
   */
  summary: string;
  
  /**
   * Reasoning for the suggestion
   */
  reasoning: string;
}
