# AI Code Review Action

Automated PR code review powered by AI — supports GitHub Models, GitHub Copilot, OpenAI, Anthropic, Google Gemini, xAI, OpenRouter, Ollama, Azure, AWS, and more.

## Quick Start

Zero-config setup using **GitHub Models** — works with `GITHUB_TOKEN`, no extra secrets needed:

```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  pull-requests: write
  contents: read
  models: read

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: n-devs/ai-code-review@v1
        with:
          gh_pat: ${{ secrets.GITHUB_TOKEN }}
          repo: ${{ github.repository }}
          pr_number: ${{ github.event.pull_request.number }}
          api_key: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `gh_pat` | ✅ | — | GitHub PAT for GitHub API (fetching diff, posting comments) |
| `repo` | ✅ | — | Repository in `owner/repo` format |
| `pr_number` | ✅ | — | Pull request number to review |
| `api_key` | ✅ | — | API key for the provider. For `github-models`: use `GITHUB_TOKEN`. For `copilot`: use a personal PAT with Copilot subscription |
| `provider` | | `github-models` | AI provider shorthand (see [Providers](#providers)) |
| `model` | | `gpt-4o` | Model name |
| `title` | | `AI Code Review` | Title shown in the PR comment header |
| `api_url` | | — | Full endpoint URL — overrides provider + api_type defaults |
| `api_type` | | `chat` | API format: `chat`, `responses`, or `messages` |
| `max_tokens` | | `2048` | Maximum tokens in AI response |
| `max_diff_chars` | | `10000` | Maximum characters of diff sent to AI |
| `language` | | `English` | Language for the review response |

## Providers

| `provider` | `api_type` default | Base URL | Auth |
|---|---|---|---|
| `github-models` | `chat` | `https://models.inference.ai.azure.com` | `GITHUB_TOKEN` ✅ |
| `copilot` | `chat` | `https://api.githubcopilot.com` | Personal PAT with Copilot subscription |
| `openai` | `chat` | `https://api.openai.com/v1` | API key |
| `anthropic` | `messages` | `https://api.anthropic.com/v1` | API key |
| `openrouter` | `chat` | `https://openrouter.ai/api/v1` | API key |
| `ollama` | `chat` | `http://localhost:11434/v1` | — |
| `xai` | `chat` | `https://api.x.ai/v1` | API key (Grok) |
| `zai` | `chat` | `https://api.z.ai/api/coding/paas/v4` | API key (GLM) |
| `google` | `chat` | `https://generativelanguage.googleapis.com/v1beta/openai` | API key |
| `azure` | `chat` | ⚠️ requires `api_url` | `api-key` header |
| `aws` | `chat` | ⚠️ requires `api_url` | API key |
| `custom` | `chat` | ⚠️ requires `api_url` | API key |

> **Note:** `copilot` provider exchanges a personal PAT for a short-lived session token automatically. `GITHUB_TOKEN` from GitHub Actions will not work for Copilot — use `github-models` instead for zero-config setups.

## API Types

| `api_type` | Path appended | Compatible with |
|---|---|---|
| `chat` | `/chat/completions` | GitHub Models, Copilot, OpenAI, OpenRouter, Ollama, xAI, Google, Azure |
| `responses` | `/responses` | OpenAI Responses API |
| `messages` | `/messages` | Anthropic Claude |
| `text` | `/completions` | Legacy completions endpoint |

## Examples

### GitHub Models (default — zero config)

```yaml
- uses: n-devs/ai-code-review@v1
  with:
    gh_pat: ${{ secrets.GITHUB_TOKEN }}
    repo: ${{ github.repository }}
    pr_number: ${{ github.event.pull_request.number }}
    api_key: ${{ secrets.GITHUB_TOKEN }}
```

### GitHub Copilot

> Requires a personal PAT with Copilot subscription stored as `COPILOT_PAT` secret.

```yaml
- uses: n-devs/ai-code-review@v1
  with:
    gh_pat: ${{ secrets.GITHUB_TOKEN }}
    repo: ${{ github.repository }}
    pr_number: ${{ github.event.pull_request.number }}
    provider: copilot
    api_key: ${{ secrets.COPILOT_PAT }}
    model: gpt-4o
```

### OpenAI GPT-4o

```yaml
- uses: n-devs/ai-code-review@v1
  with:
    gh_pat: ${{ secrets.GITHUB_TOKEN }}
    repo: ${{ github.repository }}
    pr_number: ${{ github.event.pull_request.number }}
    provider: openai
    api_key: ${{ secrets.OPENAI_API_KEY }}
    model: gpt-4o
```

### Anthropic Claude

```yaml
- uses: n-devs/ai-code-review@v1
  with:
    gh_pat: ${{ secrets.GITHUB_TOKEN }}
    repo: ${{ github.repository }}
    pr_number: ${{ github.event.pull_request.number }}
    provider: anthropic
    api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    model: claude-3-5-sonnet-20241022
    max_tokens: "8192"
```

### Google Gemini

```yaml
- uses: n-devs/ai-code-review@v1
  with:
    gh_pat: ${{ secrets.GITHUB_TOKEN }}
    repo: ${{ github.repository }}
    pr_number: ${{ github.event.pull_request.number }}
    provider: google
    api_key: ${{ secrets.GOOGLE_API_KEY }}
    model: gemini-2.0-flash
```

### xAI Grok

```yaml
- uses: n-devs/ai-code-review@v1
  with:
    gh_pat: ${{ secrets.GITHUB_TOKEN }}
    repo: ${{ github.repository }}
    pr_number: ${{ github.event.pull_request.number }}
    provider: xai
    api_key: ${{ secrets.XAI_API_KEY }}
    model: grok-3
```

### OpenRouter

```yaml
- uses: n-devs/ai-code-review@v1
  with:
    gh_pat: ${{ secrets.GITHUB_TOKEN }}
    repo: ${{ github.repository }}
    pr_number: ${{ github.event.pull_request.number }}
    provider: openrouter
    api_key: ${{ secrets.OPENROUTER_API_KEY }}
    model: meta-llama/llama-3.3-70b-instruct
```

### Ollama (self-hosted)

```yaml
- uses: n-devs/ai-code-review@v1
  with:
    gh_pat: ${{ secrets.GITHUB_TOKEN }}
    repo: ${{ github.repository }}
    pr_number: ${{ github.event.pull_request.number }}
    provider: ollama
    api_key: ""
    api_url: http://my-server:11434/v1/chat/completions
    model: llama3
```

### Azure OpenAI

```yaml
- uses: n-devs/ai-code-review@v1
  with:
    gh_pat: ${{ secrets.GITHUB_TOKEN }}
    repo: ${{ github.repository }}
    pr_number: ${{ github.event.pull_request.number }}
    provider: azure
    api_key: ${{ secrets.AZURE_OPENAI_API_KEY }}
    api_url: https://my-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-01
    model: gpt-4o
```

### OpenAI Responses API

```yaml
- uses: n-devs/ai-code-review@v1
  with:
    gh_pat: ${{ secrets.GITHUB_TOKEN }}
    repo: ${{ github.repository }}
    pr_number: ${{ github.event.pull_request.number }}
    provider: openai
    api_key: ${{ secrets.OPENAI_API_KEY }}
    api_type: responses
    model: gpt-4o
```

### Custom Provider

```yaml
- uses: n-devs/ai-code-review@v1
  with:
    gh_pat: ${{ secrets.GITHUB_TOKEN }}
    repo: ${{ github.repository }}
    pr_number: ${{ github.event.pull_request.number }}
    provider: custom
    api_key: ${{ secrets.MY_API_KEY }}
    api_url: https://my-llm-proxy.internal/v1/chat/completions
    model: my-model
```

### Review in Thai

```yaml
- uses: n-devs/ai-code-review@v1
  with:
    gh_pat: ${{ secrets.GITHUB_TOKEN }}
    repo: ${{ github.repository }}
    pr_number: ${{ github.event.pull_request.number }}
    api_key: ${{ secrets.GITHUB_TOKEN }}
    language: Thai
```

## Build

```bash
npm install
npm run build   # outputs dist/index.js via @vercel/ncc
npm test        # runs unit tests via vitest
```
