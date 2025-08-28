import { NextResponse } from "next/server";

const ENDPOINT = (process.env.LIBRETRANSLATE_URL || "https://lt.blitzw.in").replace(/\/$/, "");
const API_KEY = process.env.LIBRETRANSLATE_API_KEY || "";

export const runtime = "nodejs";

export async function GET() {
  try {
    const url = new URL(`${ENDPOINT}/languages`);
    if (API_KEY) url.searchParams.set("api_key", API_KEY);

    const r = await fetch(url.toString(), { cache: "no-store" });
    const data = await r.json();
    return NextResponse.json(data);
  } catch {
    // fallback minimal
    return NextResponse.json([
      { code: "id", name: "Indonesian" },
      { code: "en", name: "English" }
    ]);
  }
}
