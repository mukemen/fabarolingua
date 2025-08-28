import { NextRequest, NextResponse } from "next/server";

const ENDPOINT = (process.env.LIBRETRANSLATE_URL || "https://lt.blitzw.in").replace(/\/$/, "");
const API_KEY = process.env.LIBRETRANSLATE_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { text, source = "auto", target = "en" } = await req.json();
    if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });

    const body: Record<string, any> = { q: text, source, target, format: "text" };
    if (API_KEY) body.api_key = API_KEY;

    const r = await fetch(`${ENDPOINT}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const isJson = (r.headers.get("content-type") || "").includes("application/json");
    const data = isJson ? await r.json() : { error: await r.text() };

    if (!r.ok) {
      return NextResponse.json(
        { error: `LibreTranslate failed: ${r.status} ${JSON.stringify(data)}` },
        { status: r.status }
      );
    }
    return NextResponse.json({ translation: data.translatedText || "" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
