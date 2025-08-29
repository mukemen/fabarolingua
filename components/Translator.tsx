"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ====== Util kecil untuk ikon (SVG inline) ====== */
const Icon = {
  swap: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor"><path d="M7 7h11l-2.5-2.5 1.42-1.42L22.84 7l-5.92 3.92-1.42-1.42L18 8H7V7zm10 10H6l2.5 2.5-1.42 1.42L1.16 17l5.92-3.92 1.42 1.42L6 16h11v1z"/></svg>
  ),
  mic: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>
  ),
  play: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
  ),
  copy: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14h13c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
  ),
  trash: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={cls} fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
  ),
};

type Lang = { code: string; name: string };

/* Bahasa prioritas */
const PRIORITY: Lang[] = [
  { code: "id", name: "Indonesia" },
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
  { code: "min", name: "Minangkabau" },
];

/* BCP-47 untuk TTS/ASR */
const BCP47: Record<string, string> = {
  id: "id-ID", en: "en-US", ja: "ja-JP", zh: "zh-CN", ru: "ru-RU", de: "de-DE",
  hi: "hi-IN", ar: "ar-SA", fr: "fr-FR", it: "it-IT", ko: "ko-KR", nl: "nl-NL",
  jv: "jv-ID", su: "su-ID", min: "id-ID",
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

  const recRef = useRef<any>(null);
  const speakingRef = useRef(false);

  /* Ambil daftar bahasa dari /api/languages bila ada */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/languages", { cache: "no-store" });
        if (!r.ok) return;
        const arr: Lang[] = await r.json();
        if (Array.isArray(arr) && arr.length) {
          const map = new Map<string, Lang>();
          [...PRIORITY, ...arr].forEach((l) => map.set(l.code, l));
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
        body: JSON.stringify(payload),
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

  function swap() {
    setSrc((prev) => {
      const next = tgt;
      setTgt(prev);
      return next;
    });
    setResult("");
  }

  function speak(msg: string, code: string) {
    if (!msg || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(msg);
      const lang = BCP47[code] || "en-US";
      u.lang = lang;
      const voices = window.speechSynthesis.getVoices();
      const pick =
        voices.find((v) => v.lang?.toLowerCase().startsWith(lang.toLowerCase())) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith(lang.split("-")[0])) ||
        null;
      if (pick) u.voice = pick;
      speakingRef.current = true;
      u.onend = () => (speakingRef.current = false);
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function recognizer(): any | null {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    if (!recRef.current) {
      const r: any = new SR();
      r.lang = BCP47[src] || "id-ID";
      r.continuous = convMode;
      r.interimResults = false;
      r.onresult = (e: any) => {
        const t = e.results?.[e.results.length - 1]?.[0]?.transcript || "";
        if (!t) return;
        setText((p) => (p ? p + " " : "") + t);
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
    const r = recognizer();
    if (!r) { alert("Mic tidak didukung browser ini. Coba Chrome/Edge Android."); return; }
    try { r.start(); } catch {}
  }
  function stopMic() { try { recRef.current?.stop(); } catch {} }

  const disabled = useMemo(() => loading, [loading]);

  return (
    <div className="mx-auto max-w-[640px] space-y-5">
      {/* KARTU UTAMA */}
      <section className="rounded-3xl border border-white/10 bg-[#121216]/70 backdrop-blur shadow-elev p-4 sm:p-6">
        {/* Bar pilihan bahasa */}
        <div className="flex items-center gap-2">
          <select
            className="w-full h-11 rounded-2xl bg-white/[0.06] text-white border border-white/10 px-3 outline-none focus:ring-2 focus:ring-purple-500"
            value={src}
            onChange={(e) => { setSrc(e.target.value); try { if (recRef.current) recRef.current.lang = BCP47[e.target.value]; } catch {} }}
          >
            {langs.map((l) => (<option key={l.code} value={l.code}>{l.name}</option>))}
          </select>

          <button
            onClick={swap}
            className="h-11 w-11 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 active:scale-95 grid place-content-center ripple"
            title="Tukar bahasa"
            type="button"
          >
            {Icon.swap("w-5 h-5")}
          </button>

          <select
            className="w-full h-11 rounded-2xl bg-white/[0.06] text-white border border-white/10 px-3 outline-none focus:ring-2 focus:ring-purple-500"
            value={tgt}
            onChange={(e) => setTgt(e.target.value)}
          >
            {langs.map((l) => (<option key={l.code} value={l.code}>{l.name}</option>))}
          </select>
        </div>

        {/* Textarea */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Tekan & tahan mic, atau tulis teks di sini…"
            className="w-full resize-none rounded-xl bg-transparent p-2 text-white placeholder-white/40 outline-none"
          />
        </div>

        {/* Switch */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            className={`switch ${convMode ? "switch-on" : ""}`}
            onClick={() => setConvMode((v) => !v)}
          >
            <span className="mr-2">Mode Percakapan</span>
            <span className="text-white/50">(rekam → terjemah otomatis)</span>
          </button>

          <button
            type="button"
            className={`switch ${autoSpeak ? "switch-on" : ""}`}
            onClick={() => setAutoSpeak((v) => !v)}
          >
            Auto bunyikan hasil
          </button>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onMouseDown={startMic}
            onMouseUp={stopMic}
            onTouchStart={startMic}
            onTouchEnd={stopMic}
            className="btn-tonal bg-emerald-600 hover:bg-emerald-700"
            type="button"
          >
            {Icon.mic()} <span className="ml-2">Suara</span>
          </button>

          <button
            onClick={() => { setText(""); setResult(""); stopMic(); }}
            className="btn-tonal bg-neutral-700 hover:bg-neutral-600"
            type="button"
          >
            {Icon.trash()} <span className="ml-2">Hapus</span>
          </button>

          <button
            disabled={disabled}
            onClick={() => translate()}
            className="btn-primary disabled:opacity-60"
            type="button"
          >
            {loading ? "Menerjemahkan…" : "Terjemahkan"}
          </button>
        </div>
      </section>

      {/* HASIL */}
      <section className="rounded-3xl border border-white/10 bg-[#121216]/70 backdrop-blur shadow-elev p-4 sm:p-6">
        <div className="mb-2 text-sm font-semibold text-white/80">Hasil</div>
        <div className="min-h-[96px] rounded-2xl bg-black/30 p-3 text-white">
          {result || <span className="text-white/40">—</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            onClick={() => { if (!result) return; navigator.clipboard.writeText(result); }}
            className="btn-tonal bg-neutral-700 hover:bg-neutral-600"
            type="button"
          >
            {Icon.copy()} <span className="ml-2">Salin</span>
          </button>
          <button
            onClick={() => speak(result, tgt)}
            className="btn-tonal bg-emerald-600 hover:bg-emerald-700"
            type="button"
          >
            {Icon.play()} <span className="ml-2">Baca</span>
          </button>
        </div>
      </section>
    </div>
  );
}
