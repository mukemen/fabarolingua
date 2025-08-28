"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Lang = { code: string; name: string };

// BCP-47 untuk STT/TTS (fallback sederhana)
function bcp47(code: string) {
  const map: Record<string, string> = {
    id: "id-ID", en: "en-US", ja: "ja-JP", ru: "ru-RU",
    es: "es-ES", fr: "fr-FR", de: "de-DE", pt: "pt-PT",
    "pt-BR": "pt-BR", zh: "zh-CN", "zh-Hant": "zh-TW", ko: "ko-KR",
    tr: "tr-TR", th: "th-TH", vi: "vi-VN", hi: "hi-IN", ar: "ar-SA",
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

  // voice
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Ambil bahasa langsung dari API (tanpa "auto")
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/languages", { cache: "no-store" });
        const data = await r.json();
        // normalisasi: array [{code,name}, ...]
        const list: Lang[] = Array.isArray(data)
          ? data.map((x: any) => ({ code: x.code, name: x.name }))
          : (data.languages || data); // dukung bentuk {languages: [...]}
        setLangs(list);
        // sinkronkan default jika tidak ada di list
        if (!list.find(l => l.code === source) && list.length) setSource(list[0].code);
        if (!list.find(l => l.code === target) && list.length > 1) setTarget(list[1].code);
      } catch {
        // fallback minimal
        const list: Lang[] = [
          { code: "id", name: "Indonesian" },
          { code: "en", name: "English" },
          { code: "ja", name: "Japanese" },
          { code: "ru", name: "Russian" },
        ];
        setLangs(list);
      }
    })();
  }, []);

  // pastikan target tidak kosong / sama dengan source (opsional)
  useEffect(() => {
    if (langs.length === 0) return;
    if (!langs.find(l => l.code === target)) {
      const alt = langs.find(l => l.code !== source)?.code || langs[0].code;
      setTarget(alt);
    }
  }, [langs, source, target]);

  async function handleTranslate() {
    if (!text.trim()) return;
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // TANPA auto: selalu kirim source & target pilihan user
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
    const s = source, t = target;
    setSource(t); setTarget(s);
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
    rec.lang = bcp47(source); // pakai bahasa sumber yang dipilih user
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
    u.lang = bcp47(target); // pakai bahasa target
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
