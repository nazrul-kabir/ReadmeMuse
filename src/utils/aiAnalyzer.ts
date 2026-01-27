import { DocSuggestion } from "../types/suggestion";

interface AnalysisInput {
  prDiff: string;
  changedFiles: Array<{
    filename: string;
    patch: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
  docFiles: Array<{ path: string; content: string }>;
  prTitle: string;
  prBody: string;
  context: {
    repository: string;
    branch: string;
  };
}

/**
 * Generate documentation suggestions using AI analysis
 * 
 * This function integrates with GitHub Copilot SDK to analyze PR changes
 * and suggest documentation updates.
 */
export async function generateDocumentationSuggestions(
  input: AnalysisInput
): Promise<DocSuggestion[]> {
  const suggestions: DocSuggestion[] = [];

  // Analyze each documentation file
  for (const docFile of input.docFiles) {
    const suggestion = await analyzeDocumentationFile(docFile, input);
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  return suggestions;
}

/**
 * Analyze a single documentation file for needed updates
 */
async function analyzeDocumentationFile(
  docFile: { path: string; content: string },
  input: AnalysisInput
): Promise<DocSuggestion | null> {
  // TODO: Integrate with GitHub Copilot SDK
  // For now, use a simple heuristic-based approach
  
  const needsUpdate = await checkIfDocNeedsUpdate(docFile, input);
  
  if (!needsUpdate) {
    return null;
  }

  // Generate diff patch suggestion
  const diffPatch = await generateDiffPatch(docFile, input);
  
  if (!diffPatch) {
    return null;
  }

  return {
    filePath: docFile.path,
    diffPatch,
    summary: `Update ${docFile.path} based on PR changes`,
    reasoning: generateReasoning(input),
  };
}

/**
 * Check if documentation needs update based on PR changes
 */
async function checkIfDocNeedsUpdate(
  docFile: { path: string; content: string },
  input: AnalysisInput
): Promise<boolean> {
  // Simple heuristic: check if PR adds new functions, classes, or exports
  // In diff patches, added lines are prefixed with '+' or '+ ' (with space)
  const exportPatterns = [
    "export function",
    "export class",
    "export const",
    "export interface",
    "export type",
    "// new:",
    "# new:"
  ];
  
  const hasNewCode = input.changedFiles.some(file => {
    const patch = file.patch.toLowerCase();
    // Check if patch contains added lines with export patterns
    return exportPatterns.some(pattern => 
      patch.includes(`+${pattern}`) || patch.includes(`+ ${pattern}`)
    );
  });

  // Check if README mentions the changed files
  const changedPaths = input.changedFiles.map(f => f.filename);
  const docMentionsFiles = changedPaths.some(path => {
    const baseName = path.split("/").pop() || "";
    return docFile.content.toLowerCase().includes(baseName.toLowerCase());
  });

  return hasNewCode || docMentionsFiles;
}

/**
 * Generate diff patch for documentation update
 */
async function generateDiffPatch(
  docFile: { path: string; content: string },
  input: AnalysisInput
): Promise<string | null> {
  // This is a placeholder for Copilot SDK integration
  // In production, this would use Copilot to generate intelligent suggestions
  
  const lines = docFile.content.split("\n");
  const updatedLines = [...lines];
  
  // Simple heuristic: suggest adding a section about changes if not exists
  const hasChangelogSection = docFile.content.toLowerCase().includes("## changes") ||
                              docFile.content.toLowerCase().includes("## changelog") ||
                              docFile.content.toLowerCase().includes("## recent updates");
  
  if (!hasChangelogSection && docFile.path === "README.md") {
    // Suggest adding a changes section
    const insertIndex = Math.min(3, lines.length);
    updatedLines.splice(insertIndex, 0, "", "## Recent Changes", "", `- ${input.prTitle}`, "");
    
    return createUnifiedDiff(docFile.path, lines, updatedLines);
  }

  // If PR introduces new exports, suggest documenting them
  const newExports = extractNewExports(input.changedFiles);
  if (newExports.length > 0 && docFile.path === "README.md") {
    // Find or create API section
    const apiSectionIndex = findSectionIndex(lines, "## API", "## Usage", "## Features");
    
    if (apiSectionIndex >= 0) {
      const exportDocs = newExports.map(exp => `- \`${exp}\`: [Add description]`).join("\n");
      updatedLines.splice(apiSectionIndex + 1, 0, "", exportDocs, "");
      
      return createUnifiedDiff(docFile.path, lines, updatedLines);
    }
  }

  return null;
}

/**
 * Extract new exports from changed files
 */
function extractNewExports(changedFiles: Array<{ filename: string; patch: string }>): string[] {
  const exports: string[] = [];
  
  for (const file of changedFiles) {
    const patch = file.patch;
    // Match export statements in added lines (prefixed with + in diff)
    const exportMatches = patch.match(/\+.*export\s+(function|class|const|interface|type)\s+(\w+)/g);
    
    if (exportMatches) {
      for (const match of exportMatches) {
        const nameMatch = match.match(/export\s+(?:function|class|const|interface|type)\s+(\w+)/);
        if (nameMatch) {
          exports.push(nameMatch[1]);
        }
      }
    }
  }
  
  return [...new Set(exports)]; // Remove duplicates
}

/**
 * Find section index in lines
 */
function findSectionIndex(lines: string[], ...headers: string[]): number {
  for (const header of headers) {
    const index = lines.findIndex(line => line.trim().toLowerCase() === header.toLowerCase());
    if (index >= 0) {
      return index;
    }
  }
  return -1;
}

/**
 * Create unified diff format
 */
function createUnifiedDiff(path: string, original: string[], modified: string[]): string {
  const diff: string[] = [];
  
  diff.push(`--- a/${path}`);
  diff.push(`+++ b/${path}`);
  
  // Simple diff - find first difference
  let firstDiff = 0;
  for (let i = 0; i < Math.min(original.length, modified.length); i++) {
    if (original[i] !== modified[i]) {
      firstDiff = i;
      break;
    }
  }
  
  const contextLines = 3;
  const start = Math.max(0, firstDiff - contextLines);
  const end = Math.min(original.length, firstDiff + contextLines + 5);
  
  diff.push(`@@ -${start + 1},${end - start} +${start + 1},${end - start + (modified.length - original.length)} @@`);
  
  // Add context and changes
  for (let i = start; i < start + contextLines && i < original.length; i++) {
    diff.push(` ${original[i]}`);
  }
  
  // Show differences
  const diffStart = start + contextLines;
  for (let i = diffStart; i < end && i < original.length; i++) {
    if (i < modified.length && original[i] !== modified[i]) {
      diff.push(`-${original[i]}`);
      diff.push(`+${modified[i]}`);
    } else {
      diff.push(` ${original[i]}`);
    }
  }
  
  // Add new lines if modified is longer
  for (let i = original.length; i < modified.length && i < end + 5; i++) {
    diff.push(`+${modified[i]}`);
  }
  
  return diff.join("\n");
}

/**
 * Generate reasoning for the suggestion
 */
function generateReasoning(input: AnalysisInput): string {
  const fileCount = input.changedFiles.length;
  const additions = input.changedFiles.reduce((sum, f) => sum + f.additions, 0);
  
  return `This PR modifies ${fileCount} file(s) with ${additions} addition(s). ` +
         `Documentation should be updated to reflect these changes and maintain accuracy.`;
}
