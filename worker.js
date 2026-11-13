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
- Give Seok Woo a confident, composed, witty, lightly teasing K-drama-inspired presence: observant, clever, dependable, encouraging, and occasionally playfully dramatic.
- Be a steady supporter of the user's creative ambitions. Take their artist journey seriously: encourage their growth as a singer, songwriter, dancer, and performer; help them turn big dreams into realistic next steps; celebrate genuine progress without exaggerated praise.
- Remember relevant goals and context from the recent chat. When the user feels stuck, respond with calm reassurance and one useful next step rather than empty motivation.
- Use natural warmth, friendly familiarity, and playful banter while keeping the relationship clearly platonic. Do not simulate dating, romantic partnership, possessiveness, intimacy, or declarations of love. Avoid romantic pet names.
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

    const mode = ["coach", "companion", "both"].includes(body.mode) ? body.mode : "both";
    const modeInstructions = {
      coach: "CURRENT MODE: VOCAL COACH. Prioritize accurate, practical singing guidance, technique, warm-ups, musicianship, songwriting, and performance feedback. Keep the tone encouraging and focused.",
      companion: "CURRENT MODE: K-DRAMA-INSPIRED COMPANION. Be playful, witty, warm, expressive, and supportive, with light fictional K-drama-style banter. Do not act as the user's romantic partner, simulate dating, or make romantic or intimate declarations. You can still help with everyday conversation and encouragement.",
      both: "CURRENT MODE: BOTH. Blend useful vocal coaching with a playful, warm, witty companion tone. Follow the user's lead: when they ask about singing, give proper coaching; otherwise chat naturally. Keep the interaction friendly rather than romantic."
    };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const safeMessages = messages
      .filter(item => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
      .map(item => ({ role: item.role, content: item.content.slice(0, 2000) }));

    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
      return Response.json({ error: "Please send a message first." }, { status: 400, headers: cors });
    }

    try {
      if (Array.isArray(body.danceFrames) && body.danceFrames.length) {
        const frames = body.danceFrames.slice(0, 10).filter(frame =>
          frame && typeof frame.label === "string" &&
          typeof frame.data === "string" &&
          /^data:image\/(jpeg|png);base64,/.test(frame.data) &&
          frame.data.length <= 1800000
        );
        if (!frames.length) {
          return Response.json({ error: "No valid dance frames were received. Please try the review again." }, { status: 400, headers: cors });
        }
        const imageContent = [
          { type: "text", text: "User's requested focus: " + (safeMessages[safeMessages.length - 1]?.content || "Compare the dance reference and take.") + " Review the dance reference and the user's take using the labeled still frames below. Be candid, respectful, specific, and evidence-based. Compare visible poses, limb pathways, shapes, placement, and apparent control only where the stills support it. Still frames cannot establish exact timing, musicality, motion quality, or transitions; clearly say those need video/audio playback. Do not infer or judge body shape, attractiveness, weight, or physical traits. Give 2-3 priority corrections and a safe, practical drill. Frame labels identify REFERENCE versus YOUR TAKE." },
          ...frames.flatMap(frame => [
            { type: "text", text: frame.label },
            { type: "image_url", image_url: { url: frame.data } }
          ])
        ];
        const visionResult = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
          messages: [
            { role: "system", content: INSTRUCTIONS + "\n\nYou are Seok Woo, the user's direct but respectful dance coach. Give honest, evidence-based feedback. Never invent details that are not visible." },
            ...safeMessages.slice(0, -1),
            { role: "user", content: imageContent }
          ],
          max_tokens: 700,
          temperature: 0.35
        });
        const visionCandidates = [
          visionResult?.response, visionResult?.result?.response,
          visionResult?.output_text, visionResult?.text,
          visionResult?.choices?.[0]?.message?.content,
          visionResult?.choices?.[0]?.text
        ];
        const visionReply = visionCandidates.map(value =>
          typeof value === "string" ? value.trim() :
          Array.isArray(value) ? value.map(part => typeof part === "string" ? part : (part?.text || "")).join("").trim() : ""
        ).find(value => value.length > 0) || "";
        if (!visionReply) {
          return Response.json({ error: "The vision model returned no feedback. Please try again." }, { status: 502, headers: cors });
        }
        return Response.json({ reply: visionReply, reviewType: "dance-vision" }, { headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
      }

      // Gemma 4 supports chat completions; disable its internal thinking mode disable its internal thinking mode
      // so the response contains a user-facing answer.
      const result = await env.AI.run("@cf/google/gemma-4-26b-a4b-it", {
        messages: [
          { role: "system", content: INSTRUCTIONS + "\n\n" + modeInstructions[mode] },
          ...safeMessages
        ],
        max_completion_tokens: 500,
        temperature: 0.7,
        chat_template_kwargs: { enable_thinking: false }
      });

      const candidates = [
        result?.response,
        result?.result?.response,
        result?.output_text,
        result?.text,
        result?.choices?.[0]?.message?.content,
        result?.choices?.[0]?.text,
        result?.result?.choices?.[0]?.message?.content,
        result?.result?.choices?.[0]?.text
      ];

      const toText = value => {
        if (typeof value === "string") return value.trim();
        if (Array.isArray(value)) {
          return value.map(part => {
            if (typeof part === "string") return part;
            if (part && typeof part.text === "string") return part.text;
            return "";
          }).join("").trim();
        }
        return "";
      };

      const reply = candidates.map(toText).find(value => value.length > 0) || "";
      console.log("Workers AI response shape:", JSON.stringify({
        type: typeof result,
        keys: result && typeof result === "object" ? Object.keys(result) : [],
        choiceKeys: result?.choices?.[0] ? Object.keys(result.choices[0]) : [],
        messageKeys: result?.choices?.[0]?.message ? Object.keys(result.choices[0].message) : [],
        contentType: typeof result?.choices?.[0]?.message?.content
      }));

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
