import { clientIp, rateLimitHeaders, takeRateLimit } from "./_rate-limit.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const MAX_PROMPT_LENGTH = 36_000;
const MAX_ATTACHMENT_LENGTH = 10_000_000;

/**
 * Per-IP allowance. Generous enough that one person working normally through a
 * long document never hits it, tight enough that a loop cannot drain the key.
 * Image attachments cost real money per call, so they get their own, smaller
 * budget on top of the general one.
 */
const RATE_LIMIT = { limit: 30, windowMs: 60 * 60 * 1000 } as const;
const IMAGE_RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 } as const;

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

function extractGroqText(payload: unknown): string | null {
  const content = (payload as {
    choices?: Array<{
      message?: { content?: string | Array<{ type?: string; text?: string }> };
    }>;
  })?.choices?.[0]?.message?.content;

  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const text = content
      .filter(
        (part): part is { type: string; text: string } =>
          typeof part === "object" && part !== null && part.type === "text" && typeof part.text === "string",
      )
      .map((part) => part.text)
      .join("");
    if (text.trim().length > 0) return text;
  }

  return null;
}

async function callGroq(prompt: string, attachment: { mimeType: string; data: string } | null) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const model = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
  const messages: Array<
    | { role: "user"; content: string }
    | {
        role: "user";
        content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
      }
  > = [];

  if (attachment) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` },
        },
      ],
    });
  } else {
    messages.push({ role: "user", content: prompt });
  }

  const upstream = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!upstream.ok) {
    const errorBody = await upstream.text();
    throw new Error(`Groq API error: ${upstream.status}: ${errorBody}`);
  }

  const payload = (await upstream.json()) as unknown;
  const text = extractGroqText(payload);
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Groq API returned an empty response.");
  }

  return text;
}

/**
 * Keeps the AI credential on Vercel rather than exposing it in the browser
 * bundle. The UI only ever sends the prepared prompt to this same-origin route.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }

    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return json({ error: "Cross-origin requests are not allowed." }, 403);
    }

    let prompt: unknown;
    let attachment: unknown;
    try {
      ({ prompt, attachment } = (await request.json()) as {
        prompt?: unknown;
        attachment?: unknown;
      });
    } catch {
      return json({ error: "Send a valid JSON request." }, 400);
    }

    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return json({ error: "A prompt is required." }, 400);
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return json({ error: "That document is too large for one AI request." }, 413);
    }

    let groqAttachment: { mimeType: string; data: string } | null = null;
    if (attachment !== undefined) {
      if (!attachment || typeof attachment !== "object") {
        return json({ error: "The uploaded file could not be read." }, 400);
      }
      const candidate = attachment as { mimeType?: unknown; data?: unknown };
      if (
        typeof candidate.mimeType !== "string" ||
        !candidate.mimeType.startsWith("image/") ||
        typeof candidate.data !== "string" ||
        candidate.data.length > MAX_ATTACHMENT_LENGTH
      ) {
        return json({ error: "Please upload an image smaller than 7 MB." }, 413);
      }
      groqAttachment = { mimeType: candidate.mimeType, data: candidate.data };
    }

    // Counted only once the request is well-formed, so a malformed probe
    // cannot burn a real visitor's allowance, and only before any provider call,
    // so a blocked caller never spends money.
    const limit = groqAttachment ? IMAGE_RATE_LIMIT : RATE_LIMIT;
    const limitKey = `${clientIp(request)}:${groqAttachment ? "image" : "text"}`;
    const limitResult = takeRateLimit(limitKey, limit);
    if (!limitResult.ok) {
      return json(
        { error: "You have reached the hourly AI limit. Please try again later." },
        429,
        rateLimitHeaders(limitResult, limit.limit),
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return json({ error: "AI is not configured yet. Add GROQ_API_KEY in Vercel." }, 503);
    }

    try {
      const text = await callGroq(prompt, groqAttachment);
      return json({ text }, 200, rateLimitHeaders(limitResult, limit.limit));
    } catch (error) {
      console.error("[ai] Groq request failed:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "The AI service could not be reached. Please try again.";
      return json({ error: message }, 502);
    }
  },
};
