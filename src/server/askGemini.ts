import { createServerFn } from "@tanstack/react-start";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function getGeminiModel() {
  return process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
}

function getProvider() {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  return null;
}

function isQuotaOrRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /(quota|rate limit|RESOURCE_EXHAUSTED|429|exceeded your daily quota|daily quota)/i.test(message);
}

async function callGroqAPI(prompt: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[askGemini] Groq API error:", response.status, errorBody);
    throw new Error(`Groq API error: ${response.status}`);
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content;
  if (typeof text !== "string" || text.trim().length === 0) {
    console.error("[askGemini] Empty Groq response:", JSON.stringify(json));
    throw new Error("No response from AI");
  }
  return text;
}

async function callGeminiAPI(prompt: string, apiKey: string) {
  const model = getGeminiModel();
  const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[askGemini] API error:", response.status, errorBody);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("[askGemini] Empty response:", JSON.stringify(json));
    throw new Error("No response from AI");
  }
  return text;
}

export const askGeminiServerFn = createServerFn({ method: "POST" })
  .validator((prompt: string) => prompt)
  .handler(async ({ data: prompt }) => {
    const preferredProvider = getProvider();

    if (!preferredProvider) {
      console.error("[askGemini] No AI key configured");
      throw new Error("AI key not configured. Set GROQ_API_KEY or GEMINI_API_KEY in Vercel.");
    }

    const providerOrder = preferredProvider === "gemini" ? ["gemini", "groq"] : ["groq", "gemini"];
    const providers = providerOrder.filter((provider) => {
      if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
      if (provider === "groq") return Boolean(process.env.GROQ_API_KEY);
      return false;
    });

    let lastError: unknown = null;

    for (const provider of providers) {
      try {
        if (provider === "groq") {
          return await callGroqAPI(prompt);
        }

        const apiKey = process.env.GEMINI_API_KEY ?? "";
        return await callGeminiAPI(prompt, apiKey);
      } catch (err) {
        lastError = err;
        console.error("[askGemini] Failed:", provider, err);

        if (!isQuotaOrRateLimitError(err)) {
          break;
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error("AI request failed without provider response.");
  });

export async function askGemini(prompt: string): Promise<string> {
  return await askGeminiServerFn({ data: prompt });
}
