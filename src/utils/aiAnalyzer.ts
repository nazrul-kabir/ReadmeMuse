import { DocSuggestion } from "../types/suggestion";
import OpenAI from "openai";

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
  toneExamples?: string[];
}

interface AIAnalysisResponse {
  summary: string;
  reasoning: string;
  diffPatch: string;
}

// Initialize OpenAI client for AI-powered analysis
// This can use GitHub Copilot models or OpenAI models depending on configuration
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // Can be configured to use GitHub's model endpoint if needed
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return openaiClient;
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
  const client = getOpenAIClient();
  
  // If OpenAI client is available, use AI-powered analysis
  if (client) {
    try {
      const aiResponse = await analyzeWithAI(client, docFile, input);
      
      if (!aiResponse || !aiResponse.diffPatch) {
        return null;
      }
      
      return {
        filePath: docFile.path,
        diffPatch: aiResponse.diffPatch,
        summary: aiResponse.summary,
        reasoning: aiResponse.reasoning,
      };
    } catch (error) {
      console.warn(`AI analysis failed, falling back to heuristic approach:`, error);
      // Fall through to heuristic approach
    }
  }
  
  // Fallback to heuristic-based approach if AI is not available
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
 * Analyze documentation file using AI (GitHub Copilot SDK / OpenAI)
 * Generates intelligent suggestions with tone-aware context
 */
async function analyzeWithAI(
  client: OpenAI,
  docFile: { path: string; content: string },
  input: AnalysisInput
): Promise<AIAnalysisResponse | null> {
  // Check if documentation needs update first (lightweight check)
  const needsUpdate = await checkIfDocNeedsUpdate(docFile, input);
  if (!needsUpdate) {
    return null;
  }
  
  // Build the prompt with PR context, documentation, and tone examples
  const prompt = buildAIPrompt(docFile, input);
  
  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a documentation assistant that analyzes code changes and suggests precise documentation updates. You match the repository's unique voice and tone. Always output valid JSON with the required structure."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent, focused output
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }
    
    const parsed = JSON.parse(content) as AIAnalysisResponse;
    
    // Validate the response structure
    if (!parsed.summary || !parsed.reasoning || !parsed.diffPatch) {
      console.warn("AI response missing required fields:", parsed);
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error("Error calling AI API:", error);
    throw error;
  }
}

/**
 * Build AI prompt with PR diff context, existing docs, and tone examples
 */
function buildAIPrompt(
  docFile: { path: string; content: string },
  input: AnalysisInput
): string {
  const changedFilesContext = input.changedFiles
    .map(file => `File: ${file.filename}\nChanges:\n${file.patch}`)
    .join("\n\n---\n\n");
  
  const toneContext = input.toneExamples && input.toneExamples.length > 0
    ? `\n\nTone Examples (match this writing style):\n${input.toneExamples.map((ex, i) => `${i + 1}. ${ex}`).join("\n")}`
    : "";
  
  // Truncate documentation content to focus on relevant sections
  const maxDocLength = 2000;
  const truncatedDoc = docFile.content.length > maxDocLength
    ? docFile.content.substring(0, maxDocLength) + "\n... (truncated)"
    : docFile.content;
  
  return `Analyze this pull request and suggest documentation updates for ${docFile.path}.

PR Title: ${input.prTitle}
PR Description: ${input.prBody || "No description provided"}

Code Changes:
${changedFilesContext}

Current Documentation Content (${docFile.path}):
\`\`\`
${truncatedDoc}
\`\`\`
${toneContext}

Task: Generate a documentation update suggestion that:
1. Reflects the code changes made in this PR
2. Matches the repository's tone and style (use tone examples as reference)
3. Is minimal and precise - only update what's necessary
4. Uses unified diff format for the patch

Output a JSON object with this exact structure:
{
  "summary": "Brief description of suggested update (1-2 sentences)",
  "reasoning": "Explanation of why this update is needed and how it preserves the repo's voice (2-3 sentences)",
  "diffPatch": "Unified diff format patch showing the suggested changes (use --- a/${docFile.path} and +++ b/${docFile.path} format)"
}

If no documentation update is needed, return empty strings for all fields.`;
}
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
    return exportPatterns.some(pattern => {
      const patternLower = pattern.toLowerCase();
      return patch.includes(`+${patternLower}`) || patch.includes(`+ ${patternLower}`);
    });
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
    // Match export statements in added lines (prefixed with + in diff), allowing optional space after '+'
    const exportMatches = patch.match(/^\+\s*export\s+(function|class|const|interface|type)\s+(\w+)/gm);
    
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
