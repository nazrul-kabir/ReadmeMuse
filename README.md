# ReadmeMuse 📝

[![CI](https://github.com/nazrul-kabir/ReadmeMuse/workflows/CI/badge.svg)](https://github.com/nazrul-kabir/ReadmeMuse/actions)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

GitHub-native, Copilot-powered partial doc diff agent — a lightweight GitHub App that suggests precise README + key doc updates only in your PRs, preserving your repo's voice and avoiding full-repo scans.

## 🚀 Quick Start

**Want to get started in 5 minutes?** → [QUICKSTART.md](QUICKSTART.md)

## Features

- 🎯 **Smart Triggering**: Only analyzes PRs when code changes touch configured watch paths
- 📋 **YAML Configuration**: Simple repo-level config to define watchlist and documentation files
- 🤖 **AI-Powered Analysis**: Uses OpenRouter (with free tier models) or OpenAI API to analyze PR diffs and generate intelligent documentation suggestions
- 🎨 **Tone Preservation**: Learns and matches your repository's unique voice using tone examples
- 💬 **PR Comments**: Posts suggestions directly as GitHub PR comments with diff patches
- 🔍 **Non-Invasive**: Only suggests updates where needed, preserving your workflow
- 🔄 **Graceful Fallback**: Works with heuristic-based analysis if AI is not configured
- 💰 **Freemium-Friendly**: Supports free tier AI models via OpenRouter

> **Note on AI Provider:** ReadmeMuse uses the OpenAI SDK (not GitHub Copilot SDK) because it's designed as a webhook-based GitHub App requiring automated, stateless processing. The GitHub Copilot SDK is better suited for interactive, session-based workflows. See [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) for detailed reasoning.

## How It Works

1. **Webhook Trigger**: Listens for PR open/update events on GitHub
2. **Path Matching**: Checks if changed files match your configured watch paths
3. **AI Analysis**: Analyzes PR diff and existing documentation content
4. **Suggestions**: Generates precise diff patches for documentation updates
5. **PR Comment**: Posts suggestions as a formatted comment with expandable diffs

## Setup

> **📖 Detailed guide**: See [QUICKSTART.md](QUICKSTART.md) for step-by-step setup

### 1. Install as GitHub App

1. Create a new GitHub App in your organization settings
2. Set the following permissions:
   - Repository contents: Read & Write (for creating config files)
   - Pull requests: Read & Write
   - Issues: Read & Write (for comments)
3. Subscribe to webhook events:
   - Installation (created, repositories added)
   - Pull request (opened, synchronize)
4. Install the app on repositories you want to monitor

**✨ ReadmeMuse automatically creates a `.readmemuse.yml` configuration template when installed!**

### 2. Configure Your Repository (Optional)

When you install ReadmeMuse, it automatically creates a `.readmemuse.yml` file in your repository root with sensible defaults. You can customize it as needed:

```yaml
# Which files to watch for changes
watchPaths:
  - "src/**/*"
  - "lib/**/*"
  - "api/**/*"

# Which documentation files to update
documentationFiles:
  - "README.md"
  - "docs/**/*.md"
  - "CONTRIBUTING.md"

# Optional: Tone examples to guide AI-generated documentation
# Provide 2-3 representative snippets from your existing docs
# This helps ReadmeMuse match your repository's unique voice
toneExamples:
  - "Our API is designed to be intuitive and developer-friendly."
  - "We believe in making complex tasks simple through elegant abstractions."
```

See [.readmemuse.yml.example](.readmemuse.yml.example) for a complete example.

### 3. Deploy the App

#### Local Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Set up environment variables (copy .env.example to .env)
cp .env.example .env

# Configure your GitHub App credentials in .env
# - APP_ID
# - PRIVATE_KEY_PATH
# - WEBHOOK_SECRET
# - OPENROUTER_API_KEY or OPENAI_API_KEY (for AI-powered analysis)

# Start the app
npm start
```

**AI Configuration (Optional but Recommended):**

ReadmeMuse supports multiple AI providers for intelligent documentation analysis:

**Option 1: OpenRouter (Recommended for Freemium)**

OpenRouter provides access to multiple AI models including free tier options, making it perfect for freemium deployments:

1. Get a free API key from [OpenRouter](https://openrouter.ai/keys)
2. Add to your `.env` file:
   ```bash
   OPENROUTER_API_KEY=your_api_key_here
   ```
3. The default free model (`meta-llama/llama-3.2-3b-instruct:free`) will be used automatically
4. Optionally customize the model:
   ```bash
   AI_MODEL=meta-llama/llama-3.2-3b-instruct:free  # Free tier
   # Or upgrade to better models:
   # AI_MODEL=anthropic/claude-3.5-sonnet
   # AI_MODEL=openai/gpt-4o
   ```

**Option 2: OpenAI (Direct)**

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to your `.env` file:
   ```bash
   OPENAI_API_KEY=your_api_key_here
   AI_MODEL=gpt-4o-mini  # Optional, this is the default
   ```

**Freemium Benefits with OpenRouter:**
- 🆓 Free tier models available (no cost for basic usage)
- 🔄 Easy upgrade path to better models
- 🌐 Access to multiple AI providers (Anthropic, Google, Meta, etc.)
- 💰 Competitive pricing for paid tiers

Without AI configuration, ReadmeMuse falls back to heuristic-based analysis which still provides useful suggestions but with less intelligence.

#### Production Deployment

Deploy to your preferred hosting platform:
- Heroku
- AWS Lambda
- Google Cloud Run
- Azure Functions
- Any Node.js hosting

## Configuration

### Watch Paths

Define which file patterns trigger documentation analysis:

```yaml
watchPaths:
  - "src/**/*"          # All files in src/
  - "lib/**/*.ts"       # TypeScript files in lib/
  - "api/**/*"          # All files in api/
  - "*.config.js"       # Config files in root
```

### Documentation Files

Specify which documentation files should be analyzed for updates:

```yaml
documentationFiles:
  - "README.md"         # Main readme
  - "docs/**/*.md"      # All markdown in docs/
  - "CONTRIBUTING.md"   # Contributing guide
  - "API.md"            # API documentation
```

### Tone Examples (AI Feature)

Help ReadmeMuse match your repository's unique voice by providing tone examples:

```yaml
toneExamples:
  - "We keep things simple and fun!"
  - "Our API is designed with developers in mind."
  - "Performance and scalability are at our core."
```

**Tips for tone examples:**
- Provide 2-5 representative snippets from your existing documentation
- Choose examples that showcase your writing style, formality level, and personality
- The AI will use these to generate suggestions that sound like they're written by your team
- Examples can be full sentences or short phrases that capture your voice

## Example Output

When a PR modifies watched files, ReadmeMuse posts a comment like:

```markdown
## 📝 ReadmeMuse: Documentation Update Suggestions

I've analyzed your PR and found potential documentation updates:

### README.md

**Summary:** Update README.md based on PR changes

**Reasoning:** This PR modifies 3 file(s) with 45 addition(s). 
Documentation should be updated to reflect these changes.

📋 View suggested diff (expandable)

---

💡 These suggestions are generated by ReadmeMuse to help keep 
your documentation in sync with code changes.
```

## Architecture

ReadmeMuse follows a clean, event-driven architecture optimized for GitHub App webhooks:

```
src/
├── index.ts                     # Main Probot app entry point
├── handlers/
│   └── pullRequestHandler.ts   # PR event handler
├── services/
│   ├── configService.ts         # Config loading
│   ├── analysisService.ts       # PR analysis orchestration
│   └── commentService.ts        # PR comment formatting
├── utils/
│   ├── pathMatcher.ts          # File pattern matching
│   └── aiAnalyzer.ts           # AI-powered doc analysis
└── types/
    ├── config.ts               # Configuration types
    └── suggestion.ts           # Suggestion types
```

**📐 Detailed Architecture Documentation**: See [ARCHITECTURE.md](ARCHITECTURE.md) for comprehensive diagrams including:
- End-to-End Data Flow Diagram
- Process-level DFD (Data Flow Diagrams)
- Sequence Diagrams with timing analysis
- Component interactions and responsibilities

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/nazrul-kabir/ReadmeMuse.git
cd ReadmeMuse

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test
```

### Running Locally

1. Set up environment variables (copy `.env.example` to `.env`)
2. Build the project: `npm run build`
3. Start the app: `npm start`
4. Use [smee.io](https://smee.io) to forward webhooks to localhost

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions covering:
- Heroku
- Docker
- Node.js servers
- Serverless platforms

## Documentation

- [QUICKSTART.md](QUICKSTART.md) - Get started in 5 minutes
- [PRODUCT_SPEC.md](PRODUCT_SPEC.md) - Comprehensive product specification
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and data flow diagrams
- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - Key architectural decisions and rationale
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

## License

ISC - See [LICENSE](LICENSE) file for details

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

## Support

- 🐛 [Report issues](https://github.com/nazrul-kabir/ReadmeMuse/issues)
- 💬 [Start a discussion](https://github.com/nazrul-kabir/ReadmeMuse/discussions)
- ⭐ Star this repo if you find it useful!

---

Built with ❤️ using [Probot](https://probot.github.io/)