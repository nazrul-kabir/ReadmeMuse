# Architecture Decision Records (ADR)

This document explains key architectural decisions made in ReadmeMuse.

## Table of Contents

- [ADR-001: AI Provider Choice - OpenAI SDK vs GitHub Copilot SDK](#adr-001-ai-provider-choice---openai-sdk-vs-github-copilot-sdk)

---

## ADR-001: AI Provider Choice - OpenAI SDK vs GitHub Copilot SDK

**Status:** Accepted  
**Date:** 2026-01-28  
**Deciders:** Development Team  

### Context

ReadmeMuse is a GitHub App that automatically suggests documentation updates when pull requests are opened or updated. It uses AI to analyze code changes and generate documentation patches. We needed to choose an AI provider for this functionality.

#### Available Options

1. **GitHub Copilot SDK** (`@github/copilot-sdk`)
   - Released in technical preview (late 2025/early 2026)
   - Multi-platform toolkit for Node.js, Python, Go
   - Designed for agentic capabilities (planning, tool invocation, file editing)
   - Supports server-side applications

2. **OpenAI SDK** (`openai`)
   - Industry-standard SDK for AI integration
   - Works with multiple providers (OpenAI, OpenRouter, Azure OpenAI)
   - Direct API access for automated workflows

3. **Direct HTTP API Calls**
   - Manual implementation of API requests
   - More control but higher maintenance

### Decision

**We chose to use the OpenAI SDK with OpenRouter/OpenAI as the primary AI provider.**

### Reasoning

#### Why NOT GitHub Copilot SDK?

While the GitHub Copilot SDK exists and supports server-side use, it has several limitations for our webhook-based automation use case:

1. **Not Designed for GitHub Apps:**
   - GitHub deprecated Copilot Extensions as GitHub Apps (November 2025)
   - The SDK is designed for interactive/programmatic sessions
   - Not optimized for webhook-triggered automation

2. **Invocation Model Mismatch:**
   - Copilot SDK works best with:
     - Interactive CLI tools
     - @-mentions in issues/PRs
     - Explicit user-triggered sessions
     - MCP server integrations
   - ReadmeMuse needs:
     - Automatic background processing
     - Webhook-triggered analysis
     - No user interaction required

3. **Architecture Incompatibility:**
   - Copilot SDK is session-based (start session → interact → end session)
   - ReadmeMuse needs stateless, event-driven processing
   - Webhook flow: Event → Analyze → Comment (one-shot operation)

4. **Integration Complexity:**
   - Would require hybrid architecture: Probot (webhooks) + programmatic SDK calls
   - Adds unnecessary complexity for straightforward AI analysis
   - OpenAI SDK provides simpler, direct API access

#### Why OpenAI SDK?

1. **Perfect Fit for Automation:**
   - Direct API calls without session management
   - Stateless operation matches webhook model
   - Simple request/response pattern

2. **Provider Flexibility:**
   - Works with OpenRouter (freemium with free tier)
   - Works with OpenAI directly
   - Works with Azure OpenAI
   - Works with any OpenAI-compatible API

3. **Freemium Economics:**
   - OpenRouter provides free tier models
   - meta-llama/llama-3.2-3b-instruct:free at $0 cost
   - Easy upgrade path to premium models

4. **Battle-Tested:**
   - Industry-standard SDK
   - Extensive documentation and community support
   - Well-maintained and stable

5. **Probot Compatibility:**
   - Integrates seamlessly with Probot framework
   - No architectural compromises needed

### Consequences

#### Positive

✅ Simple, straightforward implementation  
✅ Freemium model enabled via OpenRouter  
✅ Works with multiple AI providers  
✅ No session management complexity  
✅ Perfect for webhook-based automation  
✅ Easy to maintain and debug  

#### Negative

❌ Not using "official" GitHub Copilot branding  
❌ Manual prompt engineering required (vs. agentic planning)  
❌ No access to Copilot's tool invocation features  

#### Neutral

⚪ Can migrate to Copilot SDK in future if architecture changes  
⚪ Could add Copilot SDK as alternative option later  
⚪ Both approaches fulfill the core requirements  

### Hybrid Approach (Future Consideration)

If we wanted to leverage both:

```typescript
// Webhook flow (current - OpenAI SDK)
GitHub PR Event → Probot → OpenAI SDK → Generate Patch → Post Comment

// Interactive flow (potential - Copilot SDK)
User @mentions bot → Copilot SDK Session → Interactive refinement → Apply patch
```

This would require:
- Dual implementation paths
- Session state management for Copilot SDK
- More complex error handling
- Higher maintenance burden

**Current Decision:** Stay with OpenAI SDK for simplicity and automation focus.

### When to Reconsider

This decision should be revisited if:

1. GitHub releases official GitHub App + Copilot SDK integration
2. ReadmeMuse shifts from automated to interactive model
3. We need Copilot's agentic capabilities (tool use, planning)
4. OpenRouter/OpenAI pricing becomes prohibitive
5. Users explicitly request GitHub Copilot branding

### References

- GitHub Copilot SDK: https://www.npmjs.com/package/@github/copilot-sdk
- OpenAI SDK: https://www.npmjs.com/package/openai
- OpenRouter: https://openrouter.ai
- GitHub Apps Webhooks: https://docs.github.com/en/webhooks
- Copilot Extensions Deprecation: GitHub Blog (November 2025)

### Alternative Implementation (For Reference)

If someone wants to use Copilot SDK programmatically with ReadmeMuse:

```typescript
import { CopilotSDK } from "@github/copilot-sdk";

async function analyzeWithCopilotSDK(prDiff: string, docContent: string) {
  // This would work but requires session management
  const session = await CopilotSDK.startSession({
    context: { prDiff, docContent }
  });
  
  const result = await session.ask(
    "Generate documentation update for these changes"
  );
  
  await session.end();
  return result;
}
```

**Issue:** This adds session lifecycle management to a stateless webhook handler, increasing complexity without clear benefits.

---

## Future ADRs

- ADR-002: Tone Learning Strategy
- ADR-003: MCP Server Integration (if implemented)
- ADR-004: Multi-file Patch Strategy
