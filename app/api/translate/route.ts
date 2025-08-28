import { NextRequest, NextResponse } from "next/server";

// Pakai ENV jika ada, kalau kosong isi mirror publik yang kamu pakai:
const ENDPOINT = (process.env.LIBRETRANSLATE_URL || "https://lt.blitzw.in").replace(/\/$/, "");
const API_KEY = process.env.LIBRETRANSLATE_API_KEY || "";

// Pastikan route berjalan di Node runtime (lebih stabil untuk fetch server-to-server)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { text, source = "auto", target = "en" } = await req.json();
    if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });

    // Banyak mirror lebih kompatibel dengan x-www-form-urlencoded
    const params = new URLSearchParams();
    params.set("q", text);
    params.set("source", source);
    params.set("target", target);
    params.set("format", "text");
    if (API_KEY) params.set("api_key", API_KEY);

    // timeout supaya tidak menggantung
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 15_000);

    const r = await fetch(`${ENDPOINT}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: params.toString(),
      signal: ac.signal,
    }).finally(() => clearTimeout(t));

    const ct = r.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await r.json() : { error: await r.text() };

    if (!r.ok) {
      return NextResponse.json(
        { error: `LibreTranslate failed: ${r.status} ${JSON.stringify(data)}` },
        { status: r.status }
      );
    }

    return NextResponse.json({ translation: (data as any).translatedText || "" });
  } catch (e: any) {
    // e.message umumnya "fetch failed" kalau jaringan/timeout
    return NextResponse.json({ error: e?.message || "Network error" }, { status: 502 });
  }
}
