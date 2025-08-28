import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

const TIMEOUT_MS = 15000;

// 1) PRIORITAS: Google (kalau ada key)
async function useGoogle(q: string, source: string, target: string) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("NO_GOOGLE_KEY");
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("target", target);
  if (source !== "auto") params.set("source", source);
  params.set("format", "text");

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        signal: ac.signal,
      }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(`GOOGLE_${r.status}:${JSON.stringify(data)}`);
    return data.data.translations[0].translatedText as string;
  } finally { clearTimeout(t); }
}

// 2) Fallback: LibreTranslate (ENV atau default mirror gratis)
async function useLibre(q: string, source: string, target: string) {
  const base = (process.env.LIBRETRANSLATE_URL || "https://translate.argosopentech.com").replace(/\/$/, "");
  const key = process.env.LIBRETRANSLATE_API_KEY || "";

  const params = new URLSearchParams();
  params.set("q", q);
  params.set("source", source);
  params.set("target", target);
  params.set("format", "text");
  if (key) params.set("api_key", key);

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${base}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: params.toString(),
      signal: ac.signal,
    });
    const ct = r.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await r.json() : { error: await r.text() };
    if (!r.ok) throw new Error(`LIBRE_${r.status}:${JSON.stringify(data)}`);
    return (data as any).translatedText as string;
  } finally { clearTimeout(t); }
}

// 3) Last resort: MyMemory (gratis, tanpa key)
function norm(code: string) {
  // MyMemory lebih nyaman dua huruf
  return (code || "").toLowerCase().split("-")[0] || "en";
}
async function useMyMemory(q: string, source: string, target: string) {
  const src = source === "auto" ? "auto" : norm(source);
  const tgt = norm(target);
  const qs = new URLSearchParams({ q, langpair: `${src}|${tgt}` });

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`https://api.mymemory.translated.net/get?${qs.toString()}`, {
      signal: ac.signal, cache: "no-store",
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`MYMEM_${r.status}:${JSON.stringify(data)}`);
    return (data?.responseData?.translatedText as string) || "";
  } finally { clearTimeout(t); }
}

export async function POST(req: NextRequest) {
  try {
    const { text, source = "auto", target = "en" } = await req.json();
    if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });

    // urutan fallback: Google -> Libre -> MyMemory
    const steps = [
      () => useGoogle(text, source, target),
      () => useLibre(text, source, target),
      () => useMyMemory(text, source, target),
    ];

    let lastErr: unknown = null;
    for (const fn of steps) {
      try {
        const out = await fn();
        if (out) return NextResponse.json({ translation: out });
      } catch (e) {
        lastErr = e; // lanjut ke provider berikutnya
      }
    }

    return NextResponse.json(
      { error: `All providers failed: ${String(lastErr)}` },
      { status: 502 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
