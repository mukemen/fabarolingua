"use client";
import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  // Deteksi display-mode berubah (installed vs browser)
  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        (window.matchMedia &&
          window.matchMedia("(display-mode: standalone)").matches) ||
        (navigator as any).standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();
    const handler = () => checkStandalone();
    window.addEventListener("resize", handler);
    window.addEventListener("visibilitychange", handler);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("visibilitychange", handler);
    };
  }, []);

  useEffect(() => {
    // Tangkap event Chrome/Edge Android
    const onBIP = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // Jika sudah terpasang → sembunyikan
    const onInstalled = () => {
      setDeferred(null);
      setCanInstall(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    // Tips iOS (Safari tidak punya beforeinstallprompt)
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const standalone =
      (window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      (navigator as any).standalone === true;
    if (isIOS && !standalone) setShowIOSTip(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice; // { outcome: "accepted" | "dismissed" }
    setDeferred(null);
    setCanInstall(false);
  }

  // Jika sudah standalone (sudah di-install), jangan tampilkan apa-apa
  if (isStandalone) return null;

  // Tampilkan jika:
  // - Chrome/Edge Android: canInstall === true  (event sudah datang)
  // - iOS Safari: showIOSTip === true          (pakai instruksi manual)
  if (!canInstall && !showIOSTip) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-[520px] px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="rounded-2xl bg-white/95 backdrop-blur text-black shadow-lg shadow-black/30 px-3 py-2 flex items-center justify-between gap-3">
          {canInstall ? (
            <>
              <div className="text-sm">
                Pasang <b>Fabaro Lingua</b> di perangkat Anda
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDeferred(null);
                    setCanInstall(false);
                  }}
                  className="text-xs px-3 h-9 rounded-lg bg-neutral-200 hover:bg-neutral-300"
                >
                  Nanti
                </button>
                <button
                  onClick={handleInstall}
                  className="text-xs px-3 h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Install
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm">
                iOS: ketuk <b>Share</b> → <b>Add to Home Screen</b>
              </div>
              <button
                onClick={() => setShowIOSTip(false)}
                className="text-xs px-3 h-9 rounded-lg bg-neutral-200 hover:bg-neutral-300"
              >
                Tutup
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
