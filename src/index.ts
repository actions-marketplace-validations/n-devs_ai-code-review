import * as https from "https";
import {
  type ApiType,
  type Provider,
  resolveApiType,
  resolveApiUrl,
  isCopilotUrl,
  isAzureProvider,
  requiresApiUrl,
} from "./config";

// ดึงค่าจาก Environment Variables (รองรับทั้ง GitHub Actions inputs และ env vars ตรง)
const GH_PAT = process.env.INPUT_GH_PAT ?? process.env.GH_PAT;
const PR_NUMBER = process.env.INPUT_PR_NUMBER ?? process.env.PR_NUMBER;
const REPO = process.env.INPUT_REPO ?? process.env.REPO; // format: owner/repo
const MODEL = process.env.INPUT_MODEL ?? process.env.INPUT_COPILOT_MODEL ?? process.env.MODEL ?? process.env.COPILOT_MODEL ?? "gpt-5-mini";
const MAX_DIFF_CHARS = parseInt(process.env.INPUT_MAX_DIFF_CHARS ?? process.env.MAX_DIFF_CHARS ?? "30000", 10);
const MAX_TOKENS = parseInt(process.env.INPUT_MAX_TOKENS ?? process.env.MAX_TOKENS ?? "4096", 10);
const LANGUAGE = process.env.INPUT_LANGUAGE ?? process.env.LANGUAGE ?? "English";
const TITLE = process.env.INPUT_TITLE ?? process.env.TITLE ?? "AI Code Review";

const PROVIDER = (process.env.INPUT_PROVIDER ?? process.env.PROVIDER) as Provider | undefined;
const API_TYPE: ApiType = resolveApiType(
  PROVIDER,
  process.env.INPUT_API_TYPE ?? process.env.INPUT_COMPLETION_TYPE ?? process.env.API_TYPE ?? process.env.COMPLETION_TYPE
);
const API_URL = resolveApiUrl(PROVIDER, API_TYPE, process.env.INPUT_API_URL ?? process.env.API_URL);

if (requiresApiUrl(PROVIDER) && !process.env.INPUT_API_URL && !process.env.API_URL) {
  console.error(`api_url is required when provider is '${PROVIDER}'.`);
  process.exit(1);
}
// EXPLICIT_API_KEY is the raw api_key input (personal PAT or provider key)
// For Copilot, api_key should be a personal GitHub PAT with Copilot subscription
const EXPLICIT_API_KEY = process.env.INPUT_API_KEY ?? process.env.API_KEY;
let API_KEY = EXPLICIT_API_KEY ?? GH_PAT ?? "";

interface GitHubFile {
  filename: string;
  patch?: string;
}

interface OpenAIResponse {
  choices?: Array<{
    message: {
      content: string;
    };
    text?: string;
  }>;
}

interface AnthropicResponse {
  content?: Array<{ type: string; text: string }>;
  error?: { message: string };
}

interface ResponsesAPIResponse {
  output?: Array<{
    type: string;
    content?: Array<{ type: string; text: string }>;
  }>;
}

function fetchJson<T>(
  url: string,
  options: https.RequestOptions,
  body?: string
): Promise<{ status: number; data: T; text: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res: import("http").IncomingMessage) => {
      let raw = "";
      res.on("data", (chunk: Buffer | string) => (raw += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw), text: raw });
        } catch {
          resolve({ status: res.statusCode ?? 0, data: {} as T, text: raw });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// 1. ดึงไฟล์ที่ถูกเปลี่ยนแปลง (Diff) จาก GitHub API
async function getPrDiff(): Promise<string> {
  const url = `https://api.github.com/repos/${REPO}/pulls/${PR_NUMBER}/files`;
  const options: https.RequestOptions = {
    method: "GET",
    headers: {
      Authorization: `token ${GH_PAT}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ai-code-review",
    },
  };

  const { status, data, text } = await fetchJson<GitHubFile[]>(url, options);

  if (status !== 200) {
    console.error(`GitHub API error: ${status} ${text.slice(0, 500)}`);
    return "";
  }

  if (!Array.isArray(data)) {
    console.error(`Unexpected GitHub API response: ${text.slice(0, 500)}`);
    return "";
  }

  // รวบรวมชื่อไฟล์และ patch (ส่วนที่แก้ไข) แต่ถ้าไฟล์ใหญ่มากอาจต้องตัดบรรทัด
  let diffContent = "";

  for (const file of data) {
    if (file.patch) {
      diffContent += `File: ${file.filename}\n${file.patch}\n\n`;
      if (diffContent.length > MAX_DIFF_CHARS) {
        diffContent = diffContent.slice(0, MAX_DIFF_CHARS) + "\n\n... (diff truncated)";
        break;
      }
    }
  }

  return diffContent;
}

// 2. ส่งข้อมูลไปถาม AI
async function askAI(diffText: string): Promise<string> {
  const systemPrompt = `You are an expert Code Reviewer. Review the code and respond in ${LANGUAGE}.`;
  const userPrompt = `Please review the following code diff and suggest improvements. Also point out any security vulnerabilities if present. Respond in ${LANGUAGE}.\n\n${diffText}`;
  console.log(`Using api_type: ${API_TYPE} (${API_URL})`);
  if (API_TYPE === "chat" || API_TYPE === "text") {
    return askOpenAICompat(systemPrompt, userPrompt);
  }
  if (API_TYPE === "messages") {
    return askAnthropic(systemPrompt, userPrompt);
  }
  if (API_TYPE === "responses") {
    return askResponses(systemPrompt, userPrompt);
  }
  return askOpenAICompat(systemPrompt, userPrompt);
}

async function askOpenAICompat(systemPrompt: string, userPrompt: string): Promise<string> {
  const isChat = API_TYPE !== "text";

  const payload = isChat
    ? JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      })
    : JSON.stringify({
        model: MODEL,
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        max_tokens: MAX_TOKENS,
      });

  const headers: Record<string, string | number> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    "User-Agent": "ai-code-review",
  };

  // Azure uses api-key header instead of Bearer
  if (isAzureProvider(PROVIDER, API_URL)) {
    delete (headers as Record<string, unknown>)["Authorization"];
    headers["api-key"] = API_KEY;
  }

  if (isCopilotUrl(API_URL)) {
    headers["editor-version"] = "vscode/1.95.0";
    headers["editor-plugin-version"] = "copilot-chat/0.22.0";
    headers["openai-organization"] = "github-copilot";
    headers["openai-intent"] = "copilot-ghost";
  }

  const options: https.RequestOptions = { method: "POST", headers };
  const { status, data, text } = await fetchJson<OpenAIResponse>(API_URL, options, payload);

  if (status !== 200) {
    console.error(`AI API error: ${status}`);
    console.error(`Response: ${text.slice(0, 500)}`);
    return `⚠️ AI API returned status ${status}. Response: ${text.slice(0, 200)}`;
  }

  if (!data.choices?.length) {
    console.error(`Unexpected AI response: ${text.slice(0, 500)}`);
    return `⚠️ Unexpected AI API response format: ${text.slice(0, 200)}`;
  }

  return isChat
    ? (data.choices[0].message?.content ?? "")
    : (data.choices[0].text ?? "");
}

async function askAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
  const payload = JSON.stringify({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const options: https.RequestOptions = {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      "User-Agent": "ai-code-review",
    },
  };

  const { status, data, text } = await fetchJson<AnthropicResponse>(API_URL, options, payload);

  if (status !== 200) {
    console.error(`Anthropic API error: ${status}`);
    console.error(`Response: ${text.slice(0, 500)}`);
    return `⚠️ Anthropic API returned status ${status}. Response: ${text.slice(0, 200)}`;
  }

  const textBlock = data.content?.find((c) => c.type === "text");
  if (!textBlock) {
    console.error(`Unexpected Anthropic response: ${text.slice(0, 500)}`);
    return `⚠️ Unexpected Anthropic API response format: ${text.slice(0, 200)}`;
  }

  return textBlock.text;
}

async function askResponses(systemPrompt: string, userPrompt: string): Promise<string> {
  const payload = JSON.stringify({
    model: MODEL,
    instructions: systemPrompt,
    input: userPrompt,
  });

  const options: https.RequestOptions = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      "User-Agent": "ai-code-review",
    },
  };

  const { status, data, text } = await fetchJson<ResponsesAPIResponse>(API_URL, options, payload);

  if (status !== 200) {
    console.error(`Responses API error: ${status}`);
    console.error(`Response: ${text.slice(0, 500)}`);
    return `⚠️ Responses API returned status ${status}. Response: ${text.slice(0, 200)}`;
  }

  const message = data.output?.find((o) => o.type === "message");
  const textBlock = message?.content?.find((c) => c.type === "output_text");
  if (!textBlock) {
    console.error(`Unexpected Responses API response: ${text.slice(0, 500)}`);
    return `⚠️ Unexpected Responses API response format: ${text.slice(0, 200)}`;
  }

  return textBlock.text;
}

// 3. โพสต์คำตอบกลับลงใน GitHub PR
async function postCommentToPr(message: string): Promise<void> {
  const url = `https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments`;
  const provider = PROVIDER ?? "copilot";
  const payload = JSON.stringify({
    body: `## ${TITLE} — \`${MODEL}\` via \`${provider}\`\n\n${message}`,
  });

  const options: https.RequestOptions = {
    method: "POST",
    headers: {
      Authorization: `token ${GH_PAT}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      "User-Agent": "ai-code-review",
    },
  };

  const { status, text } = await fetchJson<unknown>(url, options, payload);

  if (status === 200 || status === 201) {
    console.log("Comment posted successfully.");
  } else {
    console.error(`Failed to post comment: ${status} ${text.slice(0, 300)}`);
  }
}

// --- Main Execution ---
async function getCopilotToken(ghPat: string): Promise<string> {
  const url = "https://api.github.com/copilot_internal/v2/token";
  const options: https.RequestOptions = {
    method: "GET",
    headers: {
      Authorization: `token ${ghPat}`,
      Accept: "application/json",
      "User-Agent": "ai-code-review",
    },
  };
  const { status, data, text } = await fetchJson<{ token?: string }>(url, options);
  if (status !== 200 || !data.token) {
    throw new Error(`Failed to get Copilot token: ${status} ${text.slice(0, 200)}`);
  }
  console.log("Copilot token obtained.");
  return data.token;
}

async function main(): Promise<void> {
  if (!GH_PAT || !PR_NUMBER || !REPO) {
    console.error("Missing required environment variables. Set GH_PAT, PR_NUMBER, REPO.");
    process.exit(1);
  }

  console.log("Fetching PR diff...");

  // Exchange PAT for Copilot session token when using Copilot API.
  // Uses api_key (personal PAT with Copilot subscription) if provided,
  // otherwise falls back to gh_pat. Note: GITHUB_TOKEN will fail here — use a personal PAT.
  if (isCopilotUrl(API_URL)) {
    const patForExchange = EXPLICIT_API_KEY ?? GH_PAT ?? "";
    if (!patForExchange) {
      console.error("Copilot requires a GitHub personal PAT with Copilot subscription. Set api_key (preferred) or gh_pat.");
      process.exit(1);
    }
    console.log("Exchanging GitHub PAT for Copilot session token...");
    API_KEY = await getCopilotToken(patForExchange);
  }

  const diff = await getPrDiff();

  if (!diff) {
    console.log("No diff found or diff is too large.");
  } else {
    console.log(`Diff size: ${diff.length} chars. Sending to AI...`);
    const reviewResult = await askAI(diff);

    console.log("Posting comment to GitHub...");
    await postCommentToPr(reviewResult);
    console.log("Done!");
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
