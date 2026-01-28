# ReadmeMuse Product Specification

This document serves as a comprehensive specification for building **ReadmeMuse**, a GitHub App that automatically suggests updates to documentation (e.g., README.md, code comments, and other markdown files) based on code changes in pull requests (PRs). It leverages GitHub Copilot's capabilities for AI-driven suggestions that match the repository's writing style and tone. The goal is to keep docs "alive" without manual effort, targeted at small SaaS teams (2–5 devs) who often skip updates.

This spec is designed to be fed directly into AI tools like GitHub Copilot, Cursor, Claude, or similar for code generation. When using it:
- Paste sections into the AI prompt (e.g., "Implement this feature based on the spec: [paste section]").
- Focus on one module at a time (e.g., webhook handler, AI analyzer).
- Use the provided tech stack and architecture diagram as constraints.

## 1. Product Overview

### One-Liner

A GitHub App that monitors PRs for code changes, analyzes diffs using a tone-aware Copilot agent, and suggests styled doc updates as PR comments or draft PRs.

### Target Users

- Small SaaS startups with 2–5 developers.
- **Pain Point**: Docs become stale after merges; teams waste 5–8 hours/week catching up.
- **Value Prop**: Suggestions appear inline in GitHub, preserving the repo's unique voice (e.g., formal, humorous) without auto-merging—devs review and approve.

### Key Differentiators

- Learns repo tone over time (via collected examples).
- Non-invasive: Only triggers on relevant changes.
- Privacy-focused: Use self-hosted components where possible.

### MVP Scope

- **Core Flow**: PR event → diff analysis → styled suggestion in PR comment.
- **Exclusions for MVP**: No auto-merge, no push/commit triggers (PR-only), no full UI dashboard (minimal config via YAML).

## 2. Functional Requirements

### Core Features

#### 1. Installation and Configuration

- Users install the app via GitHub Marketplace or direct link.
- On install, app creates a `.readmemuse.yml` template in the repo root if none exists.
- **YAML Config Example**:
  ```yaml
  watchPaths:  # Array of glob patterns for files to monitor
    - src/**/*
    - api/**/*
  docFiles:  # Array of markdown files to update
    - README.md
    - docs/*.md
  toneExamples:  # Optional array of strings for initial tone (e.g., pasted README sections)
    - "Our app is super fun and easy to use!"
  ```
- App validates config on startup/event.

#### 2. Event Triggering

- Listen for GitHub webhook events: `pull_request` (opened, synchronized—i.e., new commits).
- Filter: Only process if changed files match `watchPaths` from config.
- Skip trivial PRs (e.g., title changes only).

#### 3. Diff Analysis and Suggestion Generation

- Fetch PR diff and existing doc content via GitHub API.
- Use Copilot agent to:
  - Analyze changes (e.g., new function added → suggest README section).
  - Generate updates matching tone (prompt: "Rewrite in the repo's style using these examples: [toneExamples]").
- **Output**: A markdown-formatted suggestion with:
  - **Summary**: "Suggested update for new API endpoint."
  - **Reasoning**: "This matches your casual tone."
  - **Diff Patch**: Collapsible code block showing before/after.

#### 4. Output Delivery

- Post as a PR review comment thread.
- **Optional Stretch**: Create a draft PR with actual file changes (branch: `readmemuse-sync-[pr-number]`).

#### 5. Tone Learning (Basic for MVP)

- Store initial `toneExamples` from config.
- **Future-Proof**: Log accepted suggestions to refine prompts (not implemented in MVP).

### Non-Functional Requirements

- **Performance**: Process in <30s per event; handle up to 10 events/hour per repo.
- **Security**: Use GitHub OAuth tokens; no storage of code outside GitHub.
- **Error Handling**: Graceful failures (e.g., comment: "Couldn't generate suggestion—check config").
- **Logging**: Basic console logs for debugging.

## 3. Technical Architecture

### High-Level Diagram (Text-Based)

```
GitHub Webhook (PR Event) --> Probot App (Node.js)
  |
  +-- Validate Event & Config (configService.ts)
  |
  +-- Fetch Diff & Docs (GitHub API via Octokit)
  |
  +-- Analyze with AI Agent (aiAnalyzer.ts)
      |
      +-- Custom Prompt: Diff + Tone Examples --> AI API Call (OpenRouter/OpenAI)
      |
      +-- Generate Styled Diff Patch
  |
  +-- Post Comment (commentService.ts)
```

### Components

#### 1. Webhook Handler (`app.ts` or `index.ts`)

- Built with Probot framework.
- Event: `app.on('pull_request.opened', 'pull_request.synchronized', async (context) => {...}`.
- Extract PR details: repo, PR number, diff.

#### 2. Config Service (`configService.ts`)

- Fetch `.readmemuse.yml` from repo.
- Parse with js-yaml.
- Cache per-repo if multi-repo.

#### 3. Path Matcher (`pathMatcher.ts`)

- Use micromatch or glob to check if changed files match watchPaths.

#### 4. Analysis Service (`analysisService.ts`)

- Orchestrate: Get diff, get current docs, call AI.

#### 5. AI Analyzer (`aiAnalyzer.ts`)

- Integrate AI via OpenRouter (recommended for freemium with free tier models) or OpenAI API.
- Uses OpenAI-compatible SDK for flexibility across providers.
- **Prompt Template**:
  ```
  Analyze this code diff: [diff]
  Existing docs: [currentDocsSnippet]
  Generate updates to [docFiles] matching this tone: [toneExamples.join('\n')]
  Output: JSON { summary: string, reasoning: string, diffPatch: string }
  ```
- **For advanced**: Use custom agent via Model Context Protocol (MCP) server.
  - Self-hosted MCP: Expose endpoint for tools like "getToneExamples".
  - Agent Profile: Instructions for docs styling.

#### 6. Comment Service (`commentService.ts`)

- Use Octokit to post PR comment.
- **Markdown Format**:
  ```markdown
  ### 📝 ReadmeMuse Suggestion
  **Summary:** [summary]
  **Why?** [reasoning]
  
  <details>
  <summary>📋 View suggested diff</summary>
  
  \`\`\`diff
  [diffPatch]
  \`\`\`
  
  </details>
  
  Approve or edit as needed!
  ```

### Tech Stack

- **Language**: Node.js with TypeScript.
- **Framework**: Probot (for GitHub App boilerplate).
- **Dependencies**:
  - `@probot/octokit`
  - `js-yaml` (for config)
  - `minimatch` (for path globs)
  - `openai` (OpenAI SDK for AI calls - works with OpenRouter, OpenAI, and other compatible APIs)
- **Testing**: Jest for unit tests (e.g., path matching, config parsing).
- **Deployment**: Vercel, Heroku, or AWS Lambda. Env vars: `GITHUB_APP_ID`, `PRIVATE_KEY`, `WEBHOOK_SECRET`, `OPENROUTER_API_KEY` or `OPENAI_API_KEY`.
- **MCP Integration (Advanced)**: If using custom agent, add a separate Node.js MCP server (reference GitHub's MCP docs).

## 4. Implementation Guidelines

### MVP Build Order

1. Set up Probot app skeleton.
2. Implement webhook listener and config loader.
3. Add path filtering.
4. Integrate basic Copilot prompt for analysis (start with mock AI response).
5. Add comment posting.
6. Test end-to-end with a sample repo.

### Risks & Mitigations

- **AI Inconsistency**: Use structured JSON output in prompts.
- **Rate Limits**: Add retries with exponential backoff.
- **Tone Accuracy**: Start with simple prompts; iterate based on user feedback.

### Extensions for v2

- Draft PR creation.
- Push/commit triggers.
- Persistent tone learning (DB for examples).
- Monetization: Web dashboard for paid tiers ($10/mo per repo).

## 5. Testing & Validation

### Unit Tests

Cover config parsing, path matching, AI prompt generation.

### Integration Tests

Mock webhooks; verify comments post correctly.

### Manual Test Plan

1. Install app on a test repo.
2. Create PR with code change matching watchPaths.
3. Verify suggestion comment appears.
4. Check if tone matches provided examples.

## 6. Future Enhancements

### Phase 2 Features

- **Multi-file Patches**: Support updating multiple documentation files in one suggestion
- **Incremental Updates**: Track applied patches to avoid duplicates
- **Custom Prompts**: Per-repo AI instructions in config
- **Analytics Dashboard**: Track suggestion acceptance rates
- **Multi-language Support**: Documentation in non-English languages

### Phase 3 Features

- **Auto-merge Mode**: Optional automatic application of suggestions
- **Commit/Push Triggers**: Analyze changes on direct commits
- **Learning System**: Improve tone matching based on accepted suggestions
- **Advanced Configuration**: Fine-grained control over analysis behavior

### Monetization Strategy

- **Free Tier**: Core functionality for public repositories
- **Pro Tier** ($10/mo per repo): Private repositories, advanced features
- **Enterprise**: Custom deployment, priority support, SLA

## 7. Related Documentation

For implementation details and architecture diagrams, see:

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and data flow diagrams
- [README.md](README.md) - Project overview and setup instructions
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [QUICKSTART.md](QUICKSTART.md) - Get started in 5 minutes

## 8. Glossary

- **PR**: Pull Request
- **Diff**: Code changes between two versions
- **OpenRouter**: AI gateway providing access to multiple AI models with free tier options
- **AI SDK**: OpenAI-compatible SDK for accessing various AI providers
- **MCP**: Model Context Protocol
- **Probot**: GitHub Apps framework for Node.js
- **Octokit**: GitHub's official API client
- **Webhook**: HTTP callback for GitHub events
- **YAML**: Human-readable data serialization language

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Maintainer**: ReadmeMuse Team
