"use client";

export default function BrandBar() {
  return (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-[#2b0b52] to-[#2b0b52]/80 backdrop-blur supports-[backdrop-filter]:bg-[#2b0b52]/70 border-b border-white/10">
      <div className="mx-auto max-w-[640px] px-4 py-3 flex items-center gap-3">
        <img
          src="/icons/icon-512.png?v=5"
          alt="Fabaro Lingua"
          width={36}
          height={36}
          className="rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        />
        <div className="leading-tight">
          <h1 className="text-[20px] font-bold tracking-tight text-white">
            Fabaro <span className="text-purple-200">Lingua</span>
          </h1>
          <p className="text-[12px] text-white/70">
            Translator suara &amp; teks — <span className="font-medium text-white/80">powered by MUKEMEN.AI</span>
          </p>
        </div>
      </div>
    </header>
  );
}
