"use client";
import { useState } from "react";

export default function Translator(): JSX.Element {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleTranslate() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source: "id", target: "en" }),
      });
      const data = await res.json();
      setResult(data.translation || data.error || "Gagal menerjemahkan");
    } catch {
      setResult("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-6 bg-gradient-to-b from-purple-900 to-black text-white">
      <h1 className="text-4xl font-extrabold mb-2">🌍 Fabaro Lingua</h1>
      <p className="text-sm text-gray-300 mb-6">
        Translator suara & teks — powered by FABARO
      </p>

      <textarea
        className="border border-gray-500 rounded-lg p-3 w-full max-w-md text-black min-h-[140px] focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Tulis teks bahasa Indonesia..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        onClick={handleTranslate}
        disabled={loading}
        className="mt-4 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition text-white font-semibold shadow-lg disabled:opacity-60"
      >
        {loading ? "Menerjemahkan..." : "Terjemahkan ke Inggris"}
      </button>

      {result && (
        <div className="mt-6 p-4 rounded-lg bg-gray-100 text-black w-full max-w-md shadow">
          <b>Hasil:</b> {result}
        </div>
      )}
    </main>
  );
}
