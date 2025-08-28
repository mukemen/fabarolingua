"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Lang = { code: string; name: string };
type TargetsMap = Record<string, string[]>;

// BCP-47 untuk Speech API (STT/TTS)
function bcp47(code: string) {
  const map: Record<string, string> = {
    id: "id-ID",
    en: "en-US",
    ar: "ar-SA",
    zh: "zh-CN",
    "zh-Hant": "zh-TW",
    ja: "ja-JP",
    ko: "ko-KR",
    fr: "fr-FR",
    de: "de-DE",
    es: "es-ES",
    pt: "pt-PT",
    "pt-BR": "pt-BR",
    it: "it-IT",
    ru: "ru-RU",
    tr: "tr-TR",
    th: "th-TH",
    vi: "vi-VN",
    hi: "hi-IN",
  };
  return map[code] || `${code}-${code.toUpperCase()}`;
}

export default function Translator(): JSX.Element {
  const [langs, setLangs] = useState<Lang[]>([]);
  const [targetsMap, setTargetsMap] = useState<TargetsMap | null>(null);

  const [source, setSource] = useState<string>("auto");
  const [target, setTarget] = useState<string>("en");

  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // voice
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Muat bahasa dari API dan normalisasi bentuk respons
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/languages", { cache: "no-store" });
        const raw = await r.json();

        let list: Lang[] = [];
        let tmap: TargetsMap | null = null;

        if (Array.isArray(raw)) {
          // Bisa jadi elemen punya 'targets' (vendor tertentu)
          list = raw.map((x: any) => ({ code: x.code, name: x.name }));
          // Jika tiap item menyertakan daftar 'targets', kumpulkan jadi peta
          if (raw.some((x: any) => Array.isArray(x.targets))) {
            tmap = {};
            for (const x of raw) {
              if (Array.isArray(x.targets)) tmap[x.code] = x.targets;
            }
          }
        } else if (raw && typeof raw === "object") {
          // Bentuk { languages: [...], targets: {...} }
          if (Array.isArray(raw.languages)) list = raw.languages;
          else if (Array.isArray(raw)) list = raw as Lang[];
          if (raw.targets && typeof raw.targets === "object") tmap = raw.targets;
        }

        const withDetect = [{ code: "auto", name: "Detect" }, ...list];
        setLangs(withDetect);
        setTargetsMap(tmap || null);
      } catch {
        // Fallback minimal
        const withDetect = [
          { code: "auto", name: "Detect" },
          { code: "id", name: "Indonesian" },
          { code: "en", name: "English" },
          { code: "es", name: "Spanish" },
          { code: "fr", name: "French" },
        ];
        setLangs(withDetect);
        setTargetsMap(null);
      }
    })();
  }, []);

  // Hitung daftar target yang diizinkan untuk source terpilih
  const allowedTargets = useMemo(() => {
    const allCodes = langs.filter(l => l.code !== "auto").map(l => l.code);
    if (source === "auto") return allCodes;
    if (targetsMap && targetsMap[source]) {
      return targetsMap[source].filter((c) => allCodes.includes(c));
    }
    return allCodes;
  }, [langs, source, targetsMap]);

  // Jaga konsistensi target saat source berubah
  useEffect(() => {
    if (target === "auto" || !allowedTargets.includes(target)) {
      // pilih 'en' kalau tersedia, kalau tidak ambil pertama
      const next = allowedTargets.includes("en") ? "en" : allowedTargets[0];
      if (next) setTarget(next);
    }
  }, [allowedTargets, target]);

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
      setResult(data.translation || data.error || "Gagal menerjemahkan");
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    if (source === "auto") return; // kalau detect, tidak bisa swap
    const s = source;
    const t = target;
    setSource(t);
    setTarget(s);
    if (result) setText(result);
    setResult("");
  }

  // ===== Speech-to-Text (mic) =====
  const sttSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    const w: any = window;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  function startListening() {
    if (!sttSupported || listening) return;
    const w: any = window;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = bcp47(source === "auto" ? "id" : source); // default ID kalau detect
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

  // ===== Text-to-Speech (speaker) =====
  function speak(textToSay: string) {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) {
      alert("Peramban tidak mendukung Text-to-Speech.");
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

  const targetOptions = langs.filter(l => l.code !== "auto" && allowedTargets.includes(l.code));

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
            {targetOptions.map(l => (
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
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-xs text-black/60">{text.length} karakter</div>
            <div className="flex items-center gap-2">
              {/* MIC */}
              <button
                onClick={listening ? stopListening : startListening}
                disabled={!sttSupported}
                className={`px-3 py-2 rounded-xl text-sm font-semibold shadow ${listening ? "bg-rose-600" : "bg-emerald-600"} hover:brightness-110 disabled:opacity-40`}
                title={sttSupported ? "Gunakan suara" : "Speech-to-Text tidak didukung di browser ini"}
              >
                {listening ? "● Rekam..." : "🎤 Suara"}
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

        <div className="text-[11px] text-white/50 mt-4 text-center">
          Tips: Mic paling lancar di Chrome/Edge Android. iOS Safari membatasi Speech-to-Text.
        </div>
      </section>
    </main>
  );
}
