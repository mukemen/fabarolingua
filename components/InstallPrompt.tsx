"use client";
import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    // Android (Chrome) - beforeinstallprompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS tip: jika bukan standalone & iOS
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || (navigator as any).standalone;
    if (isIOS && !isStandalone) setShowIOSTip(true);

    // Jika sudah terpasang, sembunyikan
    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
    // outcome: "accepted" / "dismissed"
  }

  if (!visible && !showIOSTip) return null;

  return (
    <div className="fixed left-0 right-0 bottom-0 z-50">
      <div className="mx-auto max-w-[520px] px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="rounded-2xl bg-white/95 backdrop-blur text-black shadow-lg shadow-black/30 px-3 py-2 flex items-center justify-between gap-3">
          {visible ? (
            <>
              <div className="text-sm font-medium">Pasang <b>Fabaro Lingua</b> di perangkat Anda</div>
              <div className="flex gap-2">
                <button onClick={() => setVisible(false)} className="text-xs px-3 h-9 rounded-lg bg-neutral-200 hover:bg-neutral-300">Nanti</button>
                <button onClick={install} className="text-xs px-3 h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white">Install</button>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm">iOS: Buka <b>Share</b> → pilih <b>Add to Home Screen</b></div>
              <button onClick={() => setShowIOSTip(false)} className="text-xs px-3 h-9 rounded-lg bg-neutral-200 hover:bg-neutral-300">Tutup</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
