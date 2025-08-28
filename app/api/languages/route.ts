import { NextResponse } from "next/server";

const PINNED = [
  { code: "ja",  name: "Japanese (Jepang)" },
  { code: "zh",  name: "Chinese (Mandarin)" },
  { code: "ru",  name: "Russian (Rusia)" },
  { code: "de",  name: "German (Jerman)" },
  { code: "hi",  name: "Hindi (India)" },
  { code: "ar",  name: "Arabic (Arab)" },
  { code: "fr",  name: "French (Perancis)" },
  { code: "it",  name: "Italian (Italia)" },
  { code: "en",  name: "English (Amerika)" },
  { code: "ko",  name: "Korean (Korea Selatan)" },
  { code: "nl",  name: "Dutch (Belanda)" },
  { code: "su",  name: "Sundanese (Sunda)" },
  { code: "jv",  name: "Javanese (Jawa)" },
  { code: "min", name: "Minangkabau (Padang)" },
];

const FALLBACK = [
  { code: "id", name: "Indonesian (Indonesia)" },
  { code: "es", name: "Spanish (Spanyol)" },
  { code: "pt", name: "Portuguese (Portugal)" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "tr", name: "Turkish (Turki)" },
  { code: "vi", name: "Vietnamese (Vietnam)" },
  { code: "th", name: "Thai (Thailand)" },
  { code: "uk", name: "Ukrainian (Ukraina)" },
  { code: "pl", name: "Polish (Polandia)" },
  { code: "sv", name: "Swedish (Swedia)" },
];

export async function GET() {
  const base = (process.env.LIBRETRANSLATE_URL || "https://translate.argosopentech.com").replace(/\/$/, "");
  try {
    const r = await fetch(`${base}/languages`, { next: { revalidate: 0 } });
    const raw = await r.json();
    const apiList = Array.isArray(raw) ? raw.map((x:any)=>({code:x.code, name:x.name})) : [];

    const byCode: Record<string, {code:string;name:string}> = {};
    [...apiList, ...PINNED, ...FALLBACK].forEach(l => (byCode[l.code] = l));
    const list = Object.values(byCode).sort((a,b)=>a.name.localeCompare(b.name));

    return NextResponse.json(list);
  } catch {
    return NextResponse.json([...PINNED, ...FALLBACK], { status: 200 });
  }
}
