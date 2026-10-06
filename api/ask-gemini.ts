const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function getGeminiModel() {
  return process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
}

const MAX_PROMPT_LENGTH = 36_000;
const MAX_ATTACHMENT_LENGTH = 10_000_000;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getProvider() {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  return null;
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

async function callGemini(prompt: string, attachmentPart: { inline_data: { mime_type: string; data: string } } | null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const model = getGeminiModel();
  const upstream = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            ...(attachmentPart ? [attachmentPart] : []),
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!upstream.ok) {
    throw new Error(`Gemini API error: ${upstream.status}`);
  }

  const payload = (await upstream.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Gemini API returned an empty response.");
  }

  return text;
}

/**
 * Keeps the AI credential on Vercel rather than exposing it in the browser
 * bundle. The UI only ever sends the prepared prompt to this same-origin route.
 */
export default {
  async fetch(request: Request) {
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

    let attachmentPart: { inline_data: { mime_type: string; data: string } } | null = null;
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
      attachmentPart = {
        inline_data: { mime_type: candidate.mimeType, data: candidate.data },
      };
    }

    const preferredProvider = getProvider();
    if (!preferredProvider) {
      return json({ error: "AI is not configured yet. Add GROQ_API_KEY or GEMINI_API_KEY in Vercel." }, 503);
    }

    const providerOrder = preferredProvider === "gemini" ? ["gemini", "groq"] : ["groq", "gemini"];
    const providerNames = providerOrder.filter((name) => {
      if (name === "gemini") return Boolean(process.env.GEMINI_API_KEY);
      if (name === "groq") return Boolean(process.env.GROQ_API_KEY);
      return false;
    });

    let lastError: unknown = null;

    for (const provider of providerNames) {
      try {
        const text =
          provider === "groq"
            ? await callGroq(prompt, attachmentPart ? { mimeType: attachmentPart.inline_data.mime_type, data: attachmentPart.inline_data.data } : null)
            : await callGemini(prompt, attachmentPart);

        return json({ text });
      } catch (error) {
        lastError = error;
        console.error("[ai] provider request failed:", provider, error);
      }
    }

    const message =
      lastError instanceof Error && lastError.message
        ? lastError.message
        : "The AI service could not be reached. Please try again.";

    return json({ error: message }, 502);
  },
};
