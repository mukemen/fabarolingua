"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ===== Data bahasa prioritas ===== */
type Lang = { code: string; name: string };
const PRIORITY: Lang[] = [
  { code: "id", name: "Indonesia (Indonesia)" },
  { code: "en", name: "English (Amerika)" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "ru", name: "Russian" },
  { code: "de", name: "German" },
  { code: "hi", name: "Hindi" },
  { code: "ar", name: "Arabic" },
  { code: "fr", name: "French" },
  { code: "it", name: "Italian" },
  { code: "ko", name: "Korean" },
  { code: "nl", name: "Dutch" },
  { code: "jv", name: "Javanese" },
  { code: "su", name: "Sundanese" },
  { code: "min", name: "Minangkabau" }
];

/* ===== BCP-47 untuk TTS & ASR ===== */
const BCP47: Record<string, string> = {
  id: "id-ID", en: "en-US", ja: "ja-JP", zh: "zh-CN", ru: "ru-RU", de: "de-DE",
  hi: "hi-IN", ar: "ar-SA", fr: "fr-FR", it: "it-IT", ko: "ko-KR", nl: "nl-NL",
  jv: "jv-ID", su: "su-ID", min: "id-ID"
};

export default function Translator() {
  const [langs, setLangs] = useState<Lang[]>(PRIORITY);
  const [src, setSrc] = useState("id");
  const [tgt, setTgt] = useState("en");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [convMode, setConvMode] = useState(true);

  // ASR & TTS refs
  const recRef = useRef<any>(null);
  const speakingRef = useRef(false);

  /* Ambil daftar bahasa dari API jika tersedia */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/languages", { cache: "no-store" });
        if (!r.ok) return;
        const arr: Lang[] = await r.json();
        if (Array.isArray(arr) && arr.length) {
          const map = new Map<string, Lang>();
          [...PRIORITY, ...arr].forEach(l => map.set(l.code, l));
          setLangs([...map.values()]);
        }
      } catch {}
    })();
  }, []);

  /* Translate */
  async function translate(input?: string) {
    const payload = { text: (input ?? text).trim(), source: src, target: tgt };
    if (!payload.text) return;
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Terjemahan gagal");
      const out = data?.translation || "";
      setResult(out);
      if (autoSpeak) speak(out, tgt);
    } catch (e: any) {
      setResult(`Gagal: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  /* Swap bahasa */
  function swap() {
    setSrc(prev => {
      const next = tgt;
      setTgt(prev);
      return next;
    });
    setResult("");
  }

  /* TTS */
  function speak(msg: string, code: string) {
    if (!msg || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(msg);
      const lang = BCP47[code] || "en-US";
      u.lang = lang;
      const voices = window.speechSynthesis.getVoices();
      const pick =
        voices.find(v => v.lang?.toLowerCase().startsWith(lang.toLowerCase())) ||
        voices.find(v => v.lang?.toLowerCase().startsWith(lang.split("-")[0])) ||
        null;
      if (pick) u.voice = pick;
      speakingRef.current = true;
      u.onend = () => (speakingRef.current = false);
      window.speechSynthesis.speak(u);
    } catch {}
  }

  /* ASR (mic) */
  function getRecognizer(): any | null {
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    if (!recRef.current) {
      const r: any = new SR();
      r.lang = BCP47[src] || "id-ID";
      r.continuous = convMode;
      r.interimResults = false;
      r.onresult = (e: any) => {
        const t = e.results?.[e.results.length - 1]?.[0]?.transcript || "";
        if (!t) return;
        setText(prev => (prev ? prev + " " : "") + t);
        if (convMode) translate(t);
      };
      r.onend = () => {
        if (convMode && !speakingRef.current) {
          setTimeout(() => { try { r.start(); } catch {} }, 250);
        }
      };
      recRef.current = r;
    }
    try { recRef.current.lang = BCP47[src] || "id-ID"; } catch {}
    return recRef.current;
  }
  function startMic() {
    const r = getRecognizer();
    if (!r) { alert("Mic tidak didukung browser ini. Coba Chrome/Edge Android."); return; }
    try { r.start(); } catch {}
  }
  function stopMic() { try { recRef.current?.stop(); } catch {} }

  const disabled = useMemo(() => loading, [loading]);

  return (
    <div className="mx-auto max-w-[640px] space-y-5">
      {/* Card Utama */}
      <section className="rounded-3xl border border-white/10 bg-[#121216]/70 backdrop-blur shadow-[0_12px_30px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.04)] p-4 sm:p-6">
        {/* Pilihan bahasa + swap */}
        <div className="flex items-center gap-2">
          {/* custom select wrapper */}
          <div className="relative w-full">
            <select
              value={src}
              onChange={(e) => {
                setSrc(e.target.value);
                try { if (recRef.current) recRef.current.lang = BCP47[e.target.value] || "id-ID"; } catch {}
              }}
              className="block w-full h-12 rounded-2xl bg-white/10 text-white border border-white/15 px-4 pr-10 outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
            >
              {langs.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/80">▾</span>
          </div>

          <button
            onClick={swap}
            title="Tukar bahasa"
            type="button"
            className="shrink-0 h-12 w-12 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 active:scale-95 grid place-content-center"
          >
            ⇄
          </button>

          <div className="relative w-full">
            <select
              value={tgt}
              onChange={(e) => setTgt(e.target.value)}
              className="block w-full h-12 rounded-2xl bg-white/10 text-white border border-white/15 px-4 pr-10 outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
            >
              {langs.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/80">▾</span>
          </div>
        </div>

        {/* Textarea */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tekan & tahan mic, atau tulis teks di sini…"
            className="w-full resize-none rounded-xl bg-transparent p-2 text-white placeholder-white/40 outline-none"
          />
        </div>

        {/* Options */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-white/90">
            <input
              type="checkbox"
              className="h-5 w-5 accent-purple-600"
              checked={convMode}
              onChange={(e) => setConvMode(e.target.checked)}
            />
            <span className="text-sm">
              Mode Percakapan <span className="text-white/60">(rekam → terjemah otomatis)</span>
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-white/90">
            <input
              type="checkbox"
              className="h-5 w-5 accent-purple-600"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
            />
            <span className="text-sm">Auto bunyikan hasil</span>
          </label>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onMouseDown={startMic}
            onMouseUp={stopMic}
            onTouchStart={startMic}
            onTouchEnd={stopMic}
            className="inline-flex items-center rounded-2xl bg-emerald-600 px-4 py-3 text-white font-semibold hover:bg-emerald-700 active:scale-95"
            type="button"
          >
            🎤 <span className="ml-2">Suara</span>
          </button>

          <button
            onClick={() => { setText(""); setResult(""); stopMic(); }}
            className="inline-flex items-center rounded-2xl bg-neutral-700 px-4 py-3 text-white font-semibold hover:bg-neutral-600 active:scale-95"
            type="button"
          >
            🗑️ <span className="ml-2">Hapus</span>
          </button>

          <button
            disabled={disabled}
            onClick={() => translate()}
            className="inline-flex items-center rounded-2xl bg-purple-600 px-5 py-3 text-white font-semibold hover:bg-purple-700 active:scale-95 disabled:opacity-50"
            type="button"
          >
            {loading ? "Menerjemahkan…" : "Terjemahkan"}
          </button>
        </div>
      </section>

      {/* Hasil */}
      <section className="rounded-3xl border border-white/10 bg-[#121216]/70 backdrop-blur shadow-[0_12px_30px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.04)] p-4 sm:p-6">
        <div className="mb-2 text-sm font-semibold text-white/80">Hasil</div>
        <div className="min-h-[96px] rounded-2xl bg-black/30 p-3 text-white">
          {result || <span className="text-white/40">—</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            onClick={() => { if (!result) return; navigator.clipboard.writeText(result); }}
            className="inline-flex items-center rounded-2xl bg-neutral-700 px-4 py-3 text-white font-semibold hover:bg-neutral-600 active:scale-95"
            type="button"
          >
            📋 <span className="ml-2">Salin</span>
          </button>
          <button
            onClick={() => speak(result, tgt)}
            className="inline-flex items-center rounded-2xl bg-emerald-600 px-4 py-3 text-white font-semibold hover:bg-emerald-700 active:scale-95"
            type="button"
          >
            🔊 <span className="ml-2">Baca</span>
          </button>
        </div>
      </section>
    </div>
  );
}
