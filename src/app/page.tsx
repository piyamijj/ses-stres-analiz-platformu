import { SesStresPaneli } from '@/components/audio/SesStresPaneli';

export default function AnaSayfa() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1 border-b border-muted/10 pb-6">
        <div className="font-veri text-xs font-semibold uppercase tracking-widest text-accent">
          Stress Voice
        </div>
        <h1 className="text-2xl font-semibold text-ink">
          Ses Stres Analiz Platformu
        </h1>
        <p className="text-sm text-muted">
          Yüksek örnekleme hızında mikrofon girişi, donanımsal gürültü filtreleme zinciri, 
          RMS/Peak normalizasyonu ve kelime bazlı stres tespiti için tasarlanmış yüksek teknolojili analiz arayüzü.
        </p>
      </header>

      <SesStresPaneli />
    </main>
  );
}