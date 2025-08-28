import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIBRE_URL = process.env.LIBRETRANSLATE_URL || "https://libretranslate.com";

function buildSystemPrompt(src: string, tgt: string) {
  return `You are a professional translator. Translate from ${src || "detected source"} to ${tgt}. 
- Keep names, numbers and URLs unchanged.
- Preserve tone and honorifics. 
- Return ONLY the translated text without extra commentary.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, source = "auto", target = "en", provider = "libre", model = "gpt-4o-mini" } = body || {};
    if (!text || !target) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Try OpenRouter first if requested and API key exists
    if ((provider === "openrouter" || provider === "auto") && process.env.OPENROUTER_API_KEY) {
      try {
        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            messages: [
              { role: "system", content: buildSystemPrompt(source, target) },
              { role: "user", content: text }
            ]
          })
        });
        if (!resp.ok) throw new Error(`OpenRouter error ${resp.status}`);
        const data = await resp.json();
        const out = data?.choices?.[0]?.message?.content?.trim();
        if (out) return NextResponse.json({ translation: out, provider: "openrouter" });
      } catch (e) {
        // fallback to libre
      }
    }

    // LibreTranslate default
    const resp = await fetch(`${LIBRE_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: "text"
      })
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return NextResponse.json({ error: `LibreTranslate failed: ${resp.status} ${txt}` }, { status: 500 });
    }
    const data = await resp.json();
    const translated = data?.translatedText || data?.translation || "";
    return NextResponse.json({ translation: translated, provider: "libre" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
