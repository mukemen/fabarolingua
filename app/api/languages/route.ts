import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIBRE_URL = process.env.LIBRETRANSLATE_URL || "https://libretranslate.com";

const STATIC = [{"code": "auto", "name": "Detect"}, {"code": "id", "name": "Indonesian"}, {"code": "en", "name": "English"}, {"code": "ar", "name": "Arabic"}, {"code": "zh", "name": "Chinese"}, {"code": "fr", "name": "French"}, {"code": "de", "name": "German"}, {"code": "it", "name": "Italian"}, {"code": "ja", "name": "Japanese"}, {"code": "pt", "name": "Portuguese"}, {"code": "ru", "name": "Russian"}, {"code": "es", "name": "Spanish"}, {"code": "pl", "name": "Polish"}, {"code": "jv", "name": "Javanese (Eksperimental)"}, {"code": "su", "name": "Sundanese (Eksperimental)"}, {"code": "ban", "name": "Balinese (Eksperimental)"}, {"code": "ace", "name": "Acehnese (Eksperimental)"}, {"code": "min", "name": "Minangkabau (Eksperimental)"}, {"code": "bug", "name": "Buginese (Eksperimental)"}, {"code": "mad", "name": "Madurese (Eksperimental)"}];

export async function GET() {
  try {
    const resp = await fetch(`${LIBRE_URL}/languages`);
    if (!resp.ok) throw new Error("fail");
    const list = await resp.json();
    const langs = list.map((l:any) => ({ code: l.code || l, name: l.name || l }));
    const extra = STATIC.filter((s:any) => !langs.find((x:any) => x.code === s.code));
    return NextResponse.json([...langs, ...extra]);
  } catch (e) {
    return NextResponse.json(STATIC);
  }
}
