/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 973:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.REQUIRES_API_URL = exports.PROVIDER_DEFAULT_TYPE = exports.PROVIDER_BASES = exports.API_TYPE_PATHS = void 0;
exports.resolveApiType = resolveApiType;
exports.resolveApiUrl = resolveApiUrl;
exports.isCopilotUrl = isCopilotUrl;
exports.isAzureProvider = isAzureProvider;
exports.requiresApiUrl = requiresApiUrl;
exports.API_TYPE_PATHS = {
    chat: "/chat/completions",
    responses: "/responses",
    messages: "/messages",
    text: "/completions",
};
exports.PROVIDER_BASES = {
    copilot: "https://api.githubcopilot.com",
    "github-models": "https://models.inference.ai.azure.com",
    openai: "https://api.openai.com/v1",
    anthropic: "https://api.anthropic.com/v1",
    openrouter: "https://openrouter.ai/api/v1",
    ollama: "http://localhost:11434/v1",
    xai: "https://api.x.ai/v1",
    zai: "https://api.z.ai/api/coding/paas/v4",
    google: "https://generativelanguage.googleapis.com/v1beta/openai",
    // azure/aws/custom: must provide api_url
};
exports.PROVIDER_DEFAULT_TYPE = {
    anthropic: "messages",
};
exports.REQUIRES_API_URL = ["custom", "azure", "aws"];
function resolveApiType(provider, envApiType) {
    return (envApiType ?? (provider && exports.PROVIDER_DEFAULT_TYPE[provider]) ?? "chat");
}
function resolveApiUrl(provider, apiType, override) {
    if (override)
        return override;
    const base = ((provider && exports.PROVIDER_BASES[provider]) ?? "https://api.githubcopilot.com").replace(/\/$/, "");
    return base + exports.API_TYPE_PATHS[apiType];
}
function isCopilotUrl(url) {
    return url.includes("githubcopilot.com");
}
function isAzureProvider(provider, url) {
    return provider === "azure" || url.includes(".openai.azure.com");
}
function requiresApiUrl(provider) {
    return exports.REQUIRES_API_URL.includes(provider);
}


/***/ }),

/***/ 407:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
const https = __importStar(__nccwpck_require__(692));
const config_1 = __nccwpck_require__(973);
// ดึงค่าจาก Environment Variables (รองรับทั้ง GitHub Actions inputs และ env vars ตรง)
const GH_PAT = process.env.INPUT_GH_PAT ?? process.env.GH_PAT;
const PR_NUMBER = process.env.INPUT_PR_NUMBER ?? process.env.PR_NUMBER;
const REPO = process.env.INPUT_REPO ?? process.env.REPO; // format: owner/repo
const MODEL = process.env.INPUT_MODEL ?? process.env.INPUT_COPILOT_MODEL ?? process.env.MODEL ?? process.env.COPILOT_MODEL ?? "gpt-5-mini";
const MAX_DIFF_CHARS = parseInt(process.env.INPUT_MAX_DIFF_CHARS ?? process.env.MAX_DIFF_CHARS ?? "30000", 10);
const MAX_TOKENS = parseInt(process.env.INPUT_MAX_TOKENS ?? process.env.MAX_TOKENS ?? "4096", 10);
const LANGUAGE = process.env.INPUT_LANGUAGE ?? process.env.LANGUAGE ?? "English";
const TITLE = process.env.INPUT_TITLE ?? process.env.TITLE ?? "AI Code Review";
const PROVIDER = (process.env.INPUT_PROVIDER ?? process.env.PROVIDER);
const API_TYPE = (0, config_1.resolveApiType)(PROVIDER, process.env.INPUT_API_TYPE ?? process.env.INPUT_COMPLETION_TYPE ?? process.env.API_TYPE ?? process.env.COMPLETION_TYPE);
const API_URL = (0, config_1.resolveApiUrl)(PROVIDER, API_TYPE, process.env.INPUT_API_URL ?? process.env.API_URL);
if ((0, config_1.requiresApiUrl)(PROVIDER) && !process.env.INPUT_API_URL && !process.env.API_URL) {
    console.error(`api_url is required when provider is '${PROVIDER}'.`);
    process.exit(1);
}
// EXPLICIT_API_KEY is the raw api_key input (personal PAT or provider key)
// For Copilot, api_key should be a personal GitHub PAT with Copilot subscription
// Use || (not ??) so empty strings (from unset GitHub Actions secrets) fall through
const EXPLICIT_API_KEY = process.env.INPUT_API_KEY || process.env.API_KEY || undefined;
let API_KEY = EXPLICIT_API_KEY ?? GH_PAT ?? "";
function fetchJson(url, options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let raw = "";
            res.on("data", (chunk) => (raw += chunk));
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw), text: raw });
                }
                catch {
                    resolve({ status: res.statusCode ?? 0, data: {}, text: raw });
                }
            });
        });
        req.on("error", reject);
        if (body)
            req.write(body);
        req.end();
    });
}
// 1. ดึงไฟล์ที่ถูกเปลี่ยนแปลง (Diff) จาก GitHub API
async function getPrDiff() {
    const url = `https://api.github.com/repos/${REPO}/pulls/${PR_NUMBER}/files`;
    const options = {
        method: "GET",
        headers: {
            Authorization: `token ${GH_PAT}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "ai-code-review",
        },
    };
    const { status, data, text } = await fetchJson(url, options);
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
async function askAI(diffText) {
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
async function askOpenAICompat(systemPrompt, userPrompt) {
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
    const headers = {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "User-Agent": "ai-code-review",
    };
    // Azure uses api-key header instead of Bearer
    if ((0, config_1.isAzureProvider)(PROVIDER, API_URL)) {
        delete headers["Authorization"];
        headers["api-key"] = API_KEY;
    }
    if ((0, config_1.isCopilotUrl)(API_URL)) {
        headers["editor-version"] = "vscode/1.95.0";
        headers["editor-plugin-version"] = "copilot-chat/0.22.0";
        headers["openai-organization"] = "github-copilot";
        headers["openai-intent"] = "copilot-ghost";
    }
    const options = { method: "POST", headers };
    const { status, data, text } = await fetchJson(API_URL, options, payload);
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
async function askAnthropic(systemPrompt, userPrompt) {
    const payload = JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
    });
    const options = {
        method: "POST",
        headers: {
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            "User-Agent": "ai-code-review",
        },
    };
    const { status, data, text } = await fetchJson(API_URL, options, payload);
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
async function askResponses(systemPrompt, userPrompt) {
    const payload = JSON.stringify({
        model: MODEL,
        instructions: systemPrompt,
        input: userPrompt,
    });
    const options = {
        method: "POST",
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            "User-Agent": "ai-code-review",
        },
    };
    const { status, data, text } = await fetchJson(API_URL, options, payload);
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
async function postCommentToPr(message) {
    const url = `https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments`;
    const provider = PROVIDER ?? "copilot";
    const payload = JSON.stringify({
        body: `## ${TITLE} — \`${MODEL}\` via \`${provider}\`\n\n${message}`,
    });
    const options = {
        method: "POST",
        headers: {
            Authorization: `token ${GH_PAT}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            "User-Agent": "ai-code-review",
        },
    };
    const { status, text } = await fetchJson(url, options, payload);
    if (status === 200 || status === 201) {
        console.log("Comment posted successfully.");
    }
    else {
        console.error(`Failed to post comment: ${status} ${text.slice(0, 300)}`);
    }
}
// --- Main Execution ---
async function getCopilotToken(ghPat) {
    const url = "https://api.github.com/copilot_internal/v2/token";
    const options = {
        method: "GET",
        headers: {
            Authorization: `token ${ghPat}`,
            Accept: "application/json",
            "User-Agent": "ai-code-review",
        },
    };
    const { status, data, text } = await fetchJson(url, options);
    if (status !== 200 || !data.token) {
        throw new Error(`Failed to get Copilot token: ${status} ${text.slice(0, 200)}`);
    }
    console.log("Copilot token obtained.");
    return data.token;
}
async function main() {
    if (!GH_PAT || !PR_NUMBER || !REPO) {
        console.error("Missing required environment variables. Set GH_PAT, PR_NUMBER, REPO.");
        process.exit(1);
    }
    console.log("Fetching PR diff...");
    // Exchange PAT for Copilot session token when using Copilot API.
    // Uses api_key (personal PAT with Copilot subscription) if provided,
    // otherwise falls back to gh_pat. Note: GITHUB_TOKEN will fail here — use a personal PAT.
    if ((0, config_1.isCopilotUrl)(API_URL)) {
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
    }
    else {
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


/***/ }),

/***/ 692:
/***/ ((module) => {

module.exports = require("https");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(407);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;