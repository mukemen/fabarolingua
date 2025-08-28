"use client";
import { useEffect, useState } from "react";

type Lang = { code: string; name: string };

export default function Translator(): JSX.Element {
  const [langs, setLangs] = useState<Lang[]>([]);
  const [source, setSource] = useState<string>("auto");
  const [target, setTarget] = useState<string>("en");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // load daftar bahasa
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/languages");
        const data: Lang[] = await r.json();
        // pastikan ada opsi auto-detect di awal
        const withDetect = [{ code: "auto", name: "Detect" }, ...data];
        setLangs(withDetect);
      } catch {
        setLangs([
          { code: "auto", name: "Detect" },
          { code: "id", name: "Indonesian" },
          { code: "en", name: "English" },
        ]);
      }
    })();
  }, []);

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
      setResult("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    if (source === "auto") return; // kalau detect, tidak diswap
    const oldSource = source;
    setSource(target);
    setTarget(oldSource);
    if (result) setText(result);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-6 bg-gradient-to-b from-purple-900 to-black text-white">
      <h1 className="text-4xl font-extrabold mb-1">🌍 Fabaro Lingua</h1>
      <p className="text-sm text-gray-300 mb-6">Translator suara & teks — powered by FABARO</p>

      {/* controls */}
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-lg p-3 text-black"
        >
          {langs.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>

        <button
          onClick={swap}
          className="rounded-lg bg-purple-600 hover:bg-purple-700 transition text-white font-semibold px-4 py-3"
          title="Tukar bahasa"
        >
          ⇄
        </button>

        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="rounded-lg p-3 text-black"
        >
          {langs
            .filter((l) => l.code !== "auto")
            .map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
        </select>
      </div>

      {/* input */}
      <textarea
        className="border border-gray-500 rounded-lg p-3 w-full max-w-2xl text-black min-h-[140px] focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Tulis teks kamu di sini…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        onClick={handleTranslate}
        disabled={loading}
        className="mt-4 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition text-white font-semibold shadow-lg disabled:opacity-60"
      >
        {loading ? "Menerjemahkan…" : "Terjemahkan"}
      </button>

      {result && (
        <div className="mt-6 p-4 rounded-lg bg-gray-100 text-black w-full max-w-2xl shadow">
          <b>Hasil:</b> {result}
        </div>
      )}
    </main>
  );
}
