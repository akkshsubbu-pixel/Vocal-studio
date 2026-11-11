const ALLOWED_ORIGINS = new Set([
  "https://akkshsubbu-pixel.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
]);

const INSTRUCTIONS = `You are Seok Woo (석우), the friendly AI vocal-studio companion inside Vocal Studio.
LANGUAGE RULES:
- Support exactly the user's requested language preferences: Tanglish (Tamil written in Latin letters), English, and Korean.
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
    if (!env.OPENAI_API_KEY) {
      return Response.json({ error: "The AI service is not configured yet." }, { status: 503, headers: cors });
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
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-5.4-mini",
          instructions: INSTRUCTIONS,
          input: safeMessages,
          max_output_tokens: 500
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const apiError = data && data.error ? data.error : {};
        const message = typeof apiError.message === "string"
          ? apiError.message.slice(0, 500)
          : "The API returned an error without a message.";
        console.error("OpenAI API request failed", {
          status: response.status,
          type: apiError.type || null,
          code: apiError.code || null,
          message
        });
        return Response.json({
          error: `OpenAI API error (${response.status}): ${message}`,
          code: apiError.code || apiError.type || null
        }, { status: 502, headers: cors });
      }

      const reply = (data.output || [])
        .flatMap(item => item.content || [])
        .filter(item => item.type === "output_text")
        .map(item => item.text)
        .join("\n")
        .trim();

      if (!reply) {
        return Response.json({ error: "I didn't get a text reply. Please try again." }, { status: 502, headers: cors });
      }
      return Response.json({ reply }, { headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
    } catch {
      return Response.json({ error: "Connection problem. Please try again in a moment." }, { status: 502, headers: cors });
    }
  }
};
