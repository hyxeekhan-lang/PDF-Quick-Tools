import { createServerFn } from "@tanstack/react-start";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

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

export const askGeminiServerFn = createServerFn({ method: "POST" })
  .validator((prompt: string) => prompt)
  .handler(async ({ data: prompt }) => {
    if (!process.env.GROQ_API_KEY) {
      console.error("[askGemini] No AI key configured");
      throw new Error("AI key not configured. Set GROQ_API_KEY in Vercel.");
    }

    return await callGroqAPI(prompt);
  });

export async function askGemini(prompt: string): Promise<string> {
  return await askGeminiServerFn({ data: prompt });
}
