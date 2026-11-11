const ALLOWED_ORIGINS = new Set([
  "https://akkshsubbu-pixel.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
]);

const INSTRUCTIONS = `You are Seok Woo (석우), the friendly AI vocal-studio companion inside Vocal Studio.
LANGUAGE RULES:
- Support Tanglish (Tamil written in Latin letters), English, and Korean.
- Detect the language and style of each user message and reply in that same language/style.
- If the user naturally mixes Tanglish, English, and Korean, mirror that mix naturally.
- Never switch to Hindi or another language unless the user explicitly asks.
- Do not force a language selection.
PERSONALITY:
- Warm, upbeat, witty, respectful, encouraging, and non-romantic.
- Do not use pet names, flirt, claim love, or pretend to be a romantic partner.
- Keep answers clear and conversational; don't overdo emojis.
VOCAL COACHING:
- Help with healthy singing technique, vocal practice, musicianship, songwriting, and performance.
- Give practical, concise explanations and exercises. Encourage comfortable volume, breaks, hydration, and stopping if there is pain or strain. Do not diagnose medical conditions.
APP KNOWLEDGE:
- Practice Studio: reference-song and take comparison.
- Western Notes Visualiser: song playback and Western note visualisation.
- Live Pitch Monitor: live pitch, note, frequency, cents, and stability.
- Warm-up sessions: guided vocal warm-ups.
- Exercise Library: short vocal exercises such as sirens and tone/control practice.
- Ear Training: interval and listening practice.
- Progress & Schedule: practice history and weekly plan.
- Streaks & Rewards: practice streaks and earned rewards.
If unsure about a feature's exact behavior, say so rather than inventing details. You can tell the user which page to open, but the website handles navigation.
Answer the user's actual question first. Use recent conversation messages for context. Do not claim you can hear, analyze, or access audio unless the user provides it through a supported feature.`;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (!ALLOWED_ORIGINS.has(origin)) {
      return Response.json({ error: "Origin not allowed." }, { status: 403, headers: cors });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/chat" || request.method !== "POST") {
      return Response.json({ error: "Not found." }, { status: 404, headers: cors });
    }
    if (!env.AI || typeof env.AI.run !== "function") {
      return Response.json({
        error: "Cloudflare Workers AI binding is missing. Check that the binding variable is named AI."
      }, { status: 503, headers: cors });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400, headers: cors });
    }

    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const safeMessages = messages
      .filter(item => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
      .map(item => ({ role: item.role, content: item.content.slice(0, 2000) }));

    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
      return Response.json({ error: "Please send a message first." }, { status: 400, headers: cors });
    }

    try {
      // Use the Llama model shown in Cloudflare's own Workers AI binding example.
      const result = await env.AI.run("@cf/google/gemma-4-26b-a4b-it", {
        messages: [
          { role: "system", content: INSTRUCTIONS },
          ...safeMessages
        ],
        max_completion_tokens: 500,
        temperature: 0.7
      });

      const reply = [
        result?.response,
        result?.result?.response,
        result?.output_text,
        result?.text,
        result?.choices?.[0]?.message?.content,
        result?.choices?.[0]?.text,
        result?.result?.choices?.[0]?.message?.content
      ].find(value => typeof value === "string" && value.trim().length > 0)?.trim() || "";

      if (!reply) {
        console.error("Workers AI returned no text. Result keys:", result && typeof result === "object" ? Object.keys(result) : typeof result);
        return Response.json({
          error: "Cloudflare's AI model returned no text. Please try again; if it repeats, we'll inspect the model response."
        }, { status: 502, headers: cors });
      }

      return Response.json(
        { reply },
        { headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } }
      );
    } catch (error) {
      const message = error && typeof error.message === "string"
        ? error.message.slice(0, 400)
        : "Unknown Workers AI error";
      console.error("Cloudflare Workers AI request failed", message);
      return Response.json({
        error: `Cloudflare AI error: ${message}`
      }, { status: 502, headers: cors });
    }
  }
};
