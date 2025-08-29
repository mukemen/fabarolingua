"use client";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [evt, setEvt] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: any) {
      e.preventDefault();
      setEvt(e);
      setOpen(true);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!open || !evt) return null;

  return (
    <div className="fixed inset-x-0 bottom-3 z-40 mx-auto w-[92%] max-w-md rounded-2xl border border-white/10 bg-[#1a1a1f]/90 p-3 text-white backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-semibold">Install Fabaro Lingua</div>
          <div className="text-white/70">Pasang sebagai aplikasi agar cepat diakses.</div>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg bg-neutral-700 px-3 py-2 text-sm hover:bg-neutral-600"
            onClick={() => setOpen(false)}
          >
            Nanti
          </button>
          <button
            className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold hover:bg-purple-700"
            onClick={async () => { await evt.prompt(); setOpen(false); }}
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
