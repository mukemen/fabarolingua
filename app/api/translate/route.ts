// app/api/translate/route.ts
export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { text, source, target } = await req.json();
    if (!text || !source || !target) {
      return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });
    }
    const base = process.env.LIBRETRANSLATE_URL || "https://translate.argosopentech.com";
    const key = process.env.LIBRETRANSLATE_API_KEY;
    const r = await fetch(`${base}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source, target, format: "text", api_key: key || undefined }),
      cache: "no-store"
    });
    const data = await r.json();
    if (!r.ok) return new Response(JSON.stringify({ error: data?.error || "translate failed" }), { status: 400 });
    return new Response(JSON.stringify({ translation: data?.translatedText || "" }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "error" }), { status: 500 });
  }
}
