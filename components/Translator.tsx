"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Lang = { code: string; name: string };

// Bahasa prioritas
const PINNED: Lang[] = [
  { code: "ja", name: "Japanese (Jepang)" },
  { code: "zh", name: "Chinese (Mandarin)" },
  { code: "ru", name: "Russian (Rusia)" },
  { code: "de", name: "German (Jerman)" },
  { code: "hi", name: "Hindi (India)" },
  { code: "ar", name: "Arabic (Arab)" },
  { code: "fr", name: "French (Perancis)" },
  { code: "it", name: "Italian (Italia)" },
  { code: "en", name: "English (Amerika)" },
  { code: "ko", name: "Korean (Korea Selatan)" },
  { code: "nl", name: "Dutch (Belanda)" },
  { code: "su", name: "Sundanese (Sunda)" },
  { code: "jv", name: "Javanese (Jawa)" },
  { code: "min", name: "Minangkabau (Padang)" },
];

// Fallback tambahan
const FALLBACK: Lang[] = [
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

// BCP-47 untuk STT/TTS
function bcp47(code: string) {
  const map: Record<string, string> = {
    id: "id-ID", en: "en-US", ar: "ar-SA", de: "de-DE", es: "es-ES",
    fr: "fr-FR", it: "it-IT", ja: "ja-JP", ko: "ko-KR", nl: "nl-NL",
    pl: "pl-PL", pt: "pt-PT", "pt-BR": "pt-BR", ru: "ru-RU", sv: "sv-SE",
    th: "th-TH", tr: "tr-TR", uk: "uk-UA", vi: "vi-VN", zh: "zh-CN", "zh-Hant": "zh-TW",
    su: "id-ID", jv: "id-ID", min: "id-ID",
  };
  return map[code] || `${code}-${code.toUpperCase()}`;
}

export default function Translator(): JSX.Element {
  const [langs, setLangs] = useState<Lang[]>([]);
  const [source, setSource] = useState("id");
  const [target, setTarget] = useState("en");

  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [conversation, setConversation] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Ambil bahasa (tanpa "auto")
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/languages", { cache: "no-store" });
        const raw = await r.json();
        let apiList: Lang[] = [];
        if (Array.isArray(raw)) apiList = raw.map((x: any) => ({ code: x.code, name: x.name }));
        else if (raw?.languages) apiList = raw.languages;

        const by: Record<string, Lang> = {};
        [...apiList, ...PINNED, ...FALLBACK].forEach((l) => (by[l.code] = l));
        const rest = Object.values(by)
          .filter((l) => !PINNED.find((p) => p.code === l.code))
          .sort((a, b) => a.name.localeCompare(b.name));
        const final = [...PINNED, ...rest];

        setLangs(final);
        if (!final.find((l) => l.code === source)) setSource(final[0]?.code || "en");
        if (!final.find((l) => l.code === target)) setTarget(final.find((l) => l.code !== source)?.code || "id");
      } catch {
        setLangs([...PINNED, ...FALLBACK]);
      }
    })();
  }, []);

  useEffect(() => {
    if (source === target && langs.length > 1) {
      const alt = langs.find((l) => l.code !== source);
      if (alt) setTarget(alt.code);
    }
  }, [source, target, langs]);

  async function handleTranslate() {
    if (!text.trim()) return;
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source, target }),
      });
      const data = await res.json();
      const out = data.translation || data.error || "Gagal menerjemahkan";
      setResult(out);
      if (autoSpeak && out && !data.error) speak(out);
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    const s = source, t = target;
    setSource(t); setTarget(s);
    if (result) setText(result);
    setResult("");
  }

  // ==== STT ====
  const sttSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    const w: any = window;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  function startListening() {
    const w: any = window;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR || listening) return;

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = bcp47(source);
    rec.interimResults = true;
    rec.continuous = false;

    let finalText = "";
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const str = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += str + " ";
      }
      if (finalText) setText((prev) => (prev ? prev + " " : "") + finalText.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = async () => {
      setListening(false);
      if (conversation) await handleTranslate();
    };

    rec.start();
    setListening(true);
  }
  function stopListening() {
    const rec = recognitionRef.current;
    if (rec) rec.stop();
  }

  // ==== TTS ====
  function speak(txt: string) {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(txt);
    const lang = bcp47(target);
    u.lang = lang;
    const voices = window.speechSynthesis.getVoices();
    const base = lang.split("-")[0].toLowerCase();
    const v = voices.find((vv) => vv.lang.toLowerCase().startsWith(base));
    if (v) u.voice = v;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#3a0c6e] to-black text-white pt-6 pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <section className="mx-auto w-full max-w-[480px] px-4">
        {/* Header */}
        <header className="mb-4">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-400/90 text-black">🌍</div>
            <h1 className="text-[28px] font-extrabold leading-none">Fabaro Lingua</h1>
          </div>
          <p className="text-xs text-white/70 mt-1">Translator suara & teks</p>
        </header>

        {/* Language selectors (mobile-first) */}
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full h-12 rounded-xl px-3 bg-white text-black shadow shadow-black/30"
          >
            <optgroup label="Direkomendasikan">
              {PINNED.map((l) => (
                <option key={`p-src-${l.code}`} value={l.code}>{l.name}</option>
              ))}
            </optgroup>
            <optgroup label="Semua bahasa">
              {langs
                .filter((l) => !PINNED.find((p) => p.code === l.code))
                .map((l) => (
                  <option key={`src-${l.code}`} value={l.code}>{l.name}</option>
                ))}
            </optgroup>
          </select>

          <button
            onClick={swap}
            className="h-12 w-12 self-center rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] transition shadow shadow-black/30"
            title="Tukar bahasa"
          >
            ⇄
          </button>

          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full h-12 rounded-xl px-3 bg-white text-black shadow shadow-black/30"
          >
            <optgroup label="Direkomendasikan">
              {PINNED.map((l) => (
                <option key={`p-tgt-${l.code}`} value={l.code}>{l.name}</option>
              ))}
            </optgroup>
            <optgroup label="Semua bahasa">
              {langs
                .filter((l) => !PINNED.find((p) => p.code === l.code))
                .map((l) => (
                  <option key={`tgt-${l.code}`} value={l.code}>{l.name}</option>
                ))}
            </optgroup>
          </select>
        </div>

        {/* Card input */}
        <div className="mt-3 rounded-2xl bg-white/95 p-3 shadow-lg shadow-black/40">
          <textarea
            className="w-full h-40 md:h-44 rounded-xl border border-black/10 p-3 text-black outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Tekan & tahan mic, atau tulis teks di sini…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {/* Switches */}
          <div className="mt-3 grid grid-cols-1 gap-2 text-black sm:grid-cols-2">
            <label className="text-xs flex items-center gap-2">
              <input type="checkbox" checked={conversation} onChange={(e)=>setConversation(e.target.checked)} />
              Mode Percakapan (rekam → terjemah otomatis)
            </label>
            <label className="text-xs flex items-center gap-2 justify-start sm:justify-end">
              <input type="checkbox" checked={autoSpeak} onChange={(e)=>setAutoSpeak(e.target.checked)} />
              Auto bunyikan hasil
            </label>
          </div>

          {/* Action buttons (selalu rapi di HP) */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onMouseLeave={stopListening}
              onTouchStart={(e)=>{e.preventDefault(); startListening();}}
              onTouchEnd={(e)=>{e.preventDefault(); stopListening();}}
              disabled={!sttSupported}
              className={`h-11 rounded-xl text-sm font-semibold shadow ${listening ? "bg-rose-600" : "bg-emerald-600"} hover:brightness-110 disabled:opacity-40`}
              title={sttSupported ? "Tahan untuk bicara" : "STT tidak didukung di browser ini"}
            >
              {listening ? "● Bicara" : "🎤 Suara"}
            </button>

            <button
              onClick={()=>setText("")}
              className="h-11 rounded-xl text-sm font-semibold bg-neutral-800 hover:bg-neutral-700"
            >
              Hapus
            </button>

            <button
              onClick={handleTranslate}
              disabled={loading}
              className="h-11 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-700 shadow"
            >
              {loading ? "Proses…" : "Terjemahkan"}
            </button>
          </div>
        </div>

        {/* Hasil */}
        <div className="mt-3 rounded-2xl bg-white p-3 text-black shadow-lg shadow-black/40">
          <div className="flex items-center justify-between mb-2 gap-2">
            <b>Hasil</b>
            <div className="flex gap-2">
              <button
                onClick={()=>navigator.clipboard.writeText(result || "")}
                className="h-9 px-3 rounded-lg text-xs bg-neutral-200 hover:bg-neutral-300"
              >
                Salin
              </button>
              <button
                onClick={()=>result && speak(result)}
                className="h-9 px-3 rounded-lg text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                🔊 Baca
              </button>
            </div>
          </div>
          <div className="min-h-[64px] whitespace-pre-wrap">{result || <span className="text-black/50">—</span>}</div>
        </div>

        <p className="text-[11px] text-white/60 mt-4 text-center">
          powered by <b>MUKEMEN.AI</b>
        </p>
      </section>
    </main>
  );
}
