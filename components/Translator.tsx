"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Lang = { code: string; name: string };

// Fallback daftar bahasa jika API cuma balikin sedikit/timeout
const FALLBACK_LANGS: Lang[] = [
  { code: "id", name: "Indonesian" }, { code: "en", name: "English" },
  { code: "ar", name: "Arabic" },     { code: "de", name: "German" },
  { code: "es", name: "Spanish" },    { code: "fr", name: "French" },
  { code: "it", name: "Italian" },    { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },     { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },     { code: "pt", name: "Portuguese" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ru", name: "Russian" },    { code: "sv", name: "Swedish" },
  { code: "th", name: "Thai" },       { code: "tr", name: "Turkish" },
  { code: "uk", name: "Ukrainian" },  { code: "vi", name: "Vietnamese" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "zh-Hant", name: "Chinese (Traditional)" }
];

// BCP-47 untuk STT/TTS
function bcp47(code: string) {
  const map: Record<string, string> = {
    id: "id-ID", en: "en-US", ar: "ar-SA", de: "de-DE", es: "es-ES",
    fr: "fr-FR", it: "it-IT", ja: "ja-JP", ko: "ko-KR", nl: "nl-NL",
    pl: "pl-PL", pt: "pt-PT", "pt-BR": "pt-BR", ru: "ru-RU", sv: "sv-SE",
    th: "th-TH", tr: "tr-TR", uk: "uk-UA", vi: "vi-VN", zh: "zh-CN", "zh-Hant": "zh-TW",
  };
  return map[code] || `${code}-${code.toUpperCase()}`;
}

export default function Translator(): JSX.Element {
  const [langs, setLangs] = useState<Lang[]>([]);
  const [source, setSource] = useState<string>("id"); // default Indonesia
  const [target, setTarget] = useState<string>("en"); // default Inggris

  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // Voice
  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Muat semua bahasa dari API, tanpa "auto"
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/languages", { cache: "no-store" });
        const raw = await r.json();
        let list: Lang[] = [];

        if (Array.isArray(raw)) {
          list = raw.map((x: any) => ({ code: x.code, name: x.name }));
        } else if (raw && typeof raw === "object" && Array.isArray(raw.languages)) {
          list = raw.languages;
        }

        // Gabungkan dengan fallback agar tidak pernah kosong/1 bahasa saja
        const merged: Record<string, Lang> = {};
        [...list, ...FALLBACK_LANGS].forEach(l => (merged[l.code] = l));
        const final = Object.values(merged).sort((a, b) => a.name.localeCompare(b.name));

        setLangs(final);
        if (!final.find(l => l.code === source)) setSource(final[0]?.code || "en");
        if (!final.find(l => l.code === target)) setTarget(final[1]?.code || "id");
      } catch {
        setLangs(FALLBACK_LANGS);
      }
    })();
  }, []);

  // Pastikan source != target (opsional, UX)
  useEffect(() => {
    if (source === target && langs.length > 1) {
      const alt = langs.find(l => l.code !== source);
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

  // ===== Speech-to-Text (mic)
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
    rec.lang = bcp47(source);           // pakai bahasa sumber yg dipilih
    rec.interimResults = true;
    rec.continuous = false;

    let finalText = "";
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const str = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += str + " ";
      }
      if (finalText) setText(prev => (prev ? prev + " " : "") + finalText.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    rec.start();
    setListening(true);
  }
  function stopListening() {
    const rec = recognitionRef.current;
    if (rec) rec.stop();
    setListening(false);
  }

  // ===== Text-to-Speech (speaker)
  function speak(textToSay: string) {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) {
      alert("Browser tidak mendukung Text-to-Speech.");
      return;
    }
    const u = new SpeechSynthesisUtterance(textToSay);
    u.lang = bcp47(target);
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(v =>
      v.lang.toLowerCase().startsWith(bcp47(target).split("-")[0].toLowerCase())
    );
    if (match) u.voice = match;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 bg-gradient-to-b from-[#3a0c6e] to-black text-white">
      {/* Brand */}
      <header className="max-w-2xl mx-auto text-center mb-4">
        <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-400/90 text-black mr-2">🌍</div>
        <h1 className="inline text-3xl font-extrabold tracking-tight">Fabaro Lingua</h1>
        <div className="text-xs text-white/70 mt-1">Translator suara & teks — semua bahasa dari API</div>
      </header>

      {/* Controls */}
      <section className="max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-2xl p-3 bg-white text-black shadow shadow-black/30"
          >
            {langs.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>

          <button
            onClick={swap}
            className="rounded-2xl px-4 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] transition shadow shadow-black/30"
            title="Tukar bahasa"
          >
            ⇄
          </button>

          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-2xl p-3 bg-white text-black shadow shadow-black/30"
          >
            {langs.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* Input */}
        <div className="mt-4 rounded-2xl bg-white/95 p-3 shadow-lg shadow-black/30">
          <textarea
            className="w-full min-h-[140px] rounded-xl border border-black/10 p-3 text-black outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Ucapkan atau tulis teks Anda di sini…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            {/* Info & Auto-speak */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-black/60">{text.length} karakter</span>
              <label className="text-xs text-black/80 flex items-center gap-1 select-none">
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={(e) => setAutoSpeak(e.target.checked)}
                />
                Auto bunyikan hasil
              </label>
            </div>

            {/* Mic / Hapus / Translate */}
            <div className="flex items-center gap-2">
              {/* Tekan & tahan untuk rekam */}
              <button
                onMouseDown={startListening}
                onMouseUp={stopListening}
                onMouseLeave={stopListening}
                onTouchStart={(e) => { e.preventDefault(); startListening(); }}
                onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
                disabled={!sttSupported}
                className={`px-3 py-2 rounded-xl text-sm font-semibold shadow ${listening ? "bg-rose-600" : "bg-emerald-600"} hover:brightness-110 disabled:opacity-40`}
                title={sttSupported ? "Tahan untuk bicara" : "STT tidak didukung di browser ini"}
              >
                {listening ? "● Tahan..." : "🎤 Tahan utk bicara"}
              </button>

              <button
                onClick={() => setText("")}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-neutral-800 hover:bg-neutral-700"
              >
                Hapus
              </button>

              <button
                onClick={handleTranslate}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-700 shadow"
              >
                {loading ? "Menerjemahkan…" : "Terjemahkan"}
              </button>
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="mt-4 rounded-2xl bg-white p-3 text-black shadow-lg shadow-black/30">
          <div className="flex items-center justify-between mb-2">
            <b>Hasil</b>
            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(result || "")}
                className="px-3 py-1 rounded-lg text-xs bg-neutral-200 hover:bg-neutral-300"
              >
                Salin
              </button>
              <button
                onClick={() => result && speak(result)}
                className="px-3 py-1 rounded-lg text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                🔊 Baca
              </button>
            </div>
          </div>
          <div className="min-h-[64px] whitespace-pre-wrap">{result || <span className="text-black/50">—</span>}</div>
        </div>

        <div className="text-[11px] text-white/60 mt-4 text-center">
          Mic (STT) terbaik di Chrome/Edge Android. iOS Safari belum mendukung SpeechRecognition.
        </div>
      </section>
    </main>
  );
}
