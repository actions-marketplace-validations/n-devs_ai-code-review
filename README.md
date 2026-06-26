# AI Code Review Action

Automated PR code review powered by AI — supports GitHub Copilot, OpenAI, Anthropic, Google Gemini, xAI, OpenRouter, Ollama, Azure, AWS, and more.

## Quick Start

```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  pull-requests: write
  contents: read

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
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `gh_pat` | ✅ | — | GitHub PAT (for Copilot provider, also used as API key) |
| `repo` | ✅ | — | Repository in `owner/repo` format |
| `pr_number` | ✅ | — | Pull request number to review |
| `provider` | | `copilot` | AI provider shorthand (see [Providers](#providers)) |
| `model` | | `gpt-5-mini` | Model name |
| `api_key` | | — | API key for the provider (not needed when using `copilot`) |
| `api_url` | | — | Full endpoint URL — overrides provider + api_type defaults |
| `api_type` | | `chat` | API format: `chat`, `responses`, or `messages` |
| `max_tokens` | | `4096` | Maximum tokens in AI response |
| `max_diff_chars` | | `30000` | Maximum characters of diff sent to AI |
| `language` | | `English` | Language for the review response |

## Providers

| `provider` | `api_type` default | Base URL |
|---|---|---|
| `copilot` | `chat` | `https://api.githubcopilot.com` |
| `openai` | `chat` | `https://api.openai.com/v1` |
| `anthropic` | `messages` | `https://api.anthropic.com/v1` |
| `openrouter` | `chat` | `https://openrouter.ai/api/v1` |
| `ollama` | `chat` | `http://localhost:11434/v1` |
| `xai` | `chat` | `https://api.x.ai/v1` (Grok) |
| `zai` | `chat` | `https://api.z.ai/api/coding/paas/v4` (GLM) |
| `google` | `chat` | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `azure` | `chat` | ⚠️ requires `api_url` |
| `aws` | `chat` | ⚠️ requires `api_url` |
| `custom` | `chat` | ⚠️ requires `api_url` |

## API Types

| `api_type` | Path appended | Compatible with |
|---|---|---|
| `chat` | `/chat/completions` | Copilot, OpenAI, OpenRouter, Ollama, xAI, Google, Azure |
| `responses` | `/responses` | OpenAI Responses API |
| `messages` | `/messages` | Anthropic Claude |
| `text` | `/completions` | Legacy completions endpoint |

## Examples

### GitHub Copilot (default)

```yaml
- uses: n-devs/ai-code-review@v1
  with:
    gh_pat: ${{ secrets.GITHUB_TOKEN }}
    repo: ${{ github.repository }}
    pr_number: ${{ github.event.pull_request.number }}
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
    language: Thai
```

## Build

```bash
npm install
npm run build   # outputs dist/index.js via @vercel/ncc
```
