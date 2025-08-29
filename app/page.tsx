// app/page.tsx
import BrandBar from "../components/BrandBar";
import Translator from "../components/Translator";
import InstallPrompt from "../components/InstallPrompt";

export default function Page() {
  return (
    <>
      <BrandBar />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,.25)]">
          <Translator />
        </section>
        <footer className="mt-8 text-center text-xs text-white/60">
          © {new Date().getFullYear()} Fabaro Lingua — powered by <span className="font-semibold text-white/80">MUKEMEN.AI</span>
        </footer>
      </main>
      <InstallPrompt />
    </>
  );
}
