"use client";

export default function BrandBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-gradient-to-b from-[#2b0b52]/80 to-transparent backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
        <img
          src="/icons/icon-512.png?v=4"
          alt="Fabaro Lingua"
          width={36}
          height={36}
          className="rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
        />
        <div className="leading-tight">
          <h1 className="text-xl font-bold tracking-tight text-white">
            Fabaro <span className="text-purple-200">Lingua</span>
          </h1>
          <p className="text-xs text-white/70">
            Translator suara &amp; teks — <span className="font-medium text-white/80">powered by MUKEMEN.AI</span>
          </p>
        </div>
      </div>
    </header>
  );
}
