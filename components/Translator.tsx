"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Lang = { code: string; name: string };

const PRIORITY_LANGS: Lang[] = [
  { code: "id", name: "Indonesian (Indonesia)" },
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

const BCP47: Record<string, string> = {
  id: "id-ID", en: "en-US", ja: "ja-JP", zh: "zh-CN", ru: "ru-RU", de: "de-DE",
  hi: "hi-IN", ar: "ar-SA", fr: "fr-FR", it: "it-IT", ko: "ko-KR", nl: "nl-NL",
  jv: "jv-ID", su: "su-ID", min: "id-ID"
};

export default function Translator() {
  const [langs, setLangs] = useState<Lang[]>(PRIORITY_LANGS);
  const [src, setSrc] = useState("id");
  const [tgt, setTgt] = useState("en");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [convMode, setConvMode] = useState(true);

  const recRef = useRef<any>(null);
  const speakingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/languages", { cache: "no-store" });
        if (!res.ok) return;
        const arr: Lang[] = await res.json();
        if (Array.isArray(arr) && arr.length) {
          const map = new Map<string, Lang>();
          [...PRIORITY_LANGS, ...arr].forEach((l) => map.set(l.code, l));
          setLangs([...map.values()]);
        }
      } catch {}
    })();
  }, []);

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
    setSrc((prev) => { const next = tgt; setTgt(prev); return next; });
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
        voices.find((v) => v.lang?.toLowerCase().startsWith(lang.split("-")[0])) || null;
      if (pick) u.voice = pick;
      speakingRef.current = true;
      u.onend = () => (speakingRef.current = false);
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function getRecognizer(): any | null {
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
    const r = getRecognizer();
    if (!r) { alert("Mic tidak didukung browser ini. Coba Chrome/Edge Android."); return; }
    try { r.start(); } catch {}
  }
  function stopMic() { try { recRef.current?.stop(); } catch {} }

  const disabled = useMemo(() => loading, [loading]);

  return (
    <div className="space-y-4">
      {/* PILIHAN BAHASA & SWAP */}
      <div className="flex items-center gap-2">
        <select
          className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500"
          value={src}
          onChange={(e) => { setSrc(e.target.value); try { if (recRef.current) recRef.current.lang = BCP47[e.target.value] || "id-ID"; } catch {} }}
        >
          {langs.map((l) => (<option key={l.code} value={l.code}>{l.name}</option>))}
        </select>

        <button
          type="button"
          onClick={swap}
          title="Tukar bahasa"
          className="shrink-0 rounded-xl bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 active:scale-95"
        >
          ⇄
        </button>

        <select
          className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500"
          value={tgt}
          onChange={(e) => setTgt(e.target.value)}
        >
          {langs.map((l) => (<option key={l.code} value={l.code}>{l.name}</option>))}
        </select>
      </div>

      {/* INPUT */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Tekan & tahan mic, atau tulis teks di sini..."
          className="w-full resize-none rounded-xl bg-black/20 p-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-purple-500"
        />

        {/* OPTIONS */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              className="h-4 w-4 accent-purple-600"
              checked={convMode}
              onChange={(e) => setConvMode(e.target.checked)}
            />
            <span>
              Mode Percakapan <span className="text-white/50">(rekam → terjemah otomatis)</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              className="h-4 w-4 accent-purple-600"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
            />
            <span>Auto bunyikan hasil</span>
          </label>
        </div>

        {/* ACTIONS */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onMouseDown={startMic}
            onMouseUp={stopMic}
            onTouchStart={startMic}
            onTouchEnd={stopMic}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 active:scale-95"
            type="button"
          >
            🎤 Suara
          </button>

          <button
            onClick={() => { setText(""); setResult(""); stopMic(); }}
            className="rounded-xl bg-neutral-700 px-4 py-2 text-white hover:bg-neutral-600 active:scale-95"
            type="button"
          >
            Hapus
          </button>

          <button
            disabled={disabled}
            onClick={() => translate()}
            className="rounded-xl bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 active:scale-95 disabled:opacity-50"
            type="button"
          >
            {loading ? "Menerjemahkan…" : "Terjemahkan"}
          </button>
        </div>
      </div>

      {/* HASIL */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
        <div className="mb-2 text-sm font-medium text-white/80">Hasil</div>
        <div className="min-h-[84px] rounded-xl bg-black/20 p-3 text-white">
          {result || <span className="text-white/40">—</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            onClick={() => { if (!result) return; navigator.clipboard.writeText(result); }}
            className="rounded-xl bg-neutral-700 px-4 py-2 text-white hover:bg-neutral-600 active:scale-95"
            type="button"
          >
            Salin
          </button>
          <button
            onClick={() => speak(result, tgt)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 active:scale-95"
            type="button"
          >
            🔊 Baca
          </button>
        </div>
      </div>
    </div>
  );
}
