'use client';

import { useEffect, useRef, useState } from 'react';
import { useSesYakalama } from '@/hooks/useSesYakalama';
import { normalizeEt, hesaplaRMS, hesaplaPeak, dBFSDonustur } from '@/lib/audio/normalizasyon';

// Tasarım sözleşmesi renk token'ları (bkz. tailwind.config.ts)
const CANLI_CIZIM_RENGI = '#E4E6EA'; // ink — canlı waveform çizgisi
const NORMALIZE_CIZIM_RENGI = '#FF8A3D'; // accent — normalize edilmiş waveform çizgisi
const IZGARA_RENGI = 'rgba(228, 230, 234, 0.08)'; // ince referans çizgisi

interface NormalizasyonOzeti {
  kazanc: number;
  girisRMS: number;
  girisPeak: number;
}

/**
 * Ses Stres Paneli
 *
 * Modül 01 (Hassas Ses Yakalama) ve Modül 02 (Waveform Normalizasyonu ve
 * Görselleştirme) için ana arayüz bileşeni.
 *
 * Akış:
 *  1. Mikrofon girişi yakalanır ve özel high-pass/low-pass/notch filtre
 *     zincirinden geçirilir (bkz. useSesYakalama, src/lib/audio/filtreZinciri.ts).
 *  2. Filtrelenmiş sinyal, gerçek zamanlı olarak canvas üzerinde çizilir.
 *  3. Kayıt durdurulduğunda, kaydedilen ses çözümlenir; RMS/Peak tabanlı
 *     normalizasyon uygulanır (bkz. src/lib/audio/normalizasyon.ts) ve
 *     normalize edilmiş statik waveform önizlemesi çizilir.
 *
 * Modül 03 (AI tabanlı kelime bazlı stres tespiti) bu bileşenin ileride
 * bir transkript panelini besleyecek şekilde tasarlanmıştır — veri şeması
 * için bkz. src/lib/types.ts (KelimeZamanDamgasi). Aşağıdaki bilgi kutusu
 * bu hazırlığı kullanıcıya bildirir.
 */
export function SesStresPaneli() {
  const {
    kayitDurumu,
    hataMesaji,
    canliMetrikler,
    analyserNode,
    kayitliBlob,
    ornekleneHizi,
    baslat,
    durdur,
    sifirla,
  } = useSesYakalama();

  const canliCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const normalizeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cizimKareRef = useRef<number | null>(null);

  const [normalizasyonOzeti, setNormalizasyonOzeti] = useState<NormalizasyonOzeti | null>(null);

  // Efekt 1: Canlı waveform çizimi (gerçek zamanlı, filtrelenmiş sinyal üzerinden)
  useEffect(() => {
    if (kayitDurumu !== 'kayit-yapiliyor' || !analyserNode) return;

    const canvas = canliCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const veriDizisi = new Float32Array(analyserNode.fftSize);

    const cizimDongusu = () => {
      analyserNode.getFloatTimeDomainData(veriDizisi);

      const genislik = canvas.width;
      const yukseklik = canvas.height;
      const ortaY = yukseklik / 2;

      ctx.clearRect(0, 0, genislik, yukseklik);

      // İnce yatay referans çizgisi
      ctx.strokeStyle = IZGARA_RENGI;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, ortaY);
      ctx.lineTo(genislik, ortaY);
      ctx.stroke();

      // Waveform çizgisi
      ctx.strokeStyle = CANLI_CIZIM_RENGI;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const adim = Math.max(1, Math.floor(veriDizisi.length / genislik));
      for (let x = 0; x < genislik; x++) {
        const ornekIndeksi = x * adim;
        const deger = veriDizisi[ornekIndeksi] ?? 0;
        const y = ortaY + deger * (ortaY * 0.9);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      cizimKareRef.current = requestAnimationFrame(cizimDongusu);
    };

    cizimDongusu();

    return () => {
      if (cizimKareRef.current !== null) {
        cancelAnimationFrame(cizimKareRef.current);
        cizimKareRef.current = null;
      }
    };
  }, [analyserNode, kayitDurumu]);

  // Efekt 2: Kayıt tamamlandığında normalizasyon uygula ve statik waveform çiz
  useEffect(() => {
    if (kayitDurumu !== 'tamamlandi' || !kayitliBlob) return;

    let iptalEdildi = false;

    (async () => {
      let geciciAudioContext: AudioContext | null = null;

      try {
        const arrayBuffer = await kayitliBlob.arrayBuffer();

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        geciciAudioContext = new AudioContextClass();

        const decodedBuffer = await geciciAudioContext.decodeAudioData(arrayBuffer);
        if (iptalEdildi) return;

        const kanalVerisi = decodedBuffer.getChannelData(0);

        const girisRMS = hesaplaRMS(kanalVerisi);
        const girisPeak = hesaplaPeak(kanalVerisi);
        const sonuc = normalizeEt(kanalVerisi, 0.2);

        setNormalizasyonOzeti({ kazanc: sonuc.kazanc, girisRMS, girisPeak });

        const canvas = normalizeCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const genislik = canvas.width;
        const yukseklik = canvas.height;
        const ortaY = yukseklik / 2;

        ctx.clearRect(0, 0, genislik, yukseklik);

        // Referans çizgisi
        ctx.strokeStyle = IZGARA_RENGI;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, ortaY);
        ctx.lineTo(genislik, ortaY);
        ctx.stroke();

        // Her piksel bloğu için min/max genlik taranarak statik waveform çizilir
        const ornekBasinaPiksel = Math.max(1, Math.floor(sonuc.ornekler.length / genislik));

        ctx.strokeStyle = NORMALIZE_CIZIM_RENGI;
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        for (let x = 0; x < genislik; x++) {
          const baslangicIndeksi = x * ornekBasinaPiksel;
          let blokMin = 0;
          let blokMax = 0;

          for (let i = 0; i < ornekBasinaPiksel; i++) {
            const deger = sonuc.ornekler[baslangicIndeksi + i];
            if (deger === undefined) continue;
            if (deger > blokMax) blokMax = deger;
            if (deger < blokMin) blokMin = deger;
          }

          const y1 = ortaY - blokMax * (ortaY * 0.95);
          const y2 = ortaY - blokMin * (ortaY * 0.95);
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y2);
        }
        ctx.stroke();
      } catch (hata) {
        console.error('[SesStresPaneli] Ses çözümleme veya normalizasyon hatası:', hata);
      } finally {
        if (geciciAudioContext && geciciAudioContext.state !== 'closed') {
          geciciAudioContext.close().catch(() => {});
        }
      }
    })();

    return () => {
      iptalEdildi = true;
    };
  }, [kayitDurumu, kayitliBlob]);

  const rmsDBGoster = Number.isFinite(canliMetrikler.rmsDB)
    ? `${canliMetrikler.rmsDB.toFixed(1)} dBFS`
    : '-∞ dBFS';
  const peakDBGoster = Number.isFinite(canliMetrikler.peakDB)
    ? `${canliMetrikler.peakDB.toFixed(1)} dBFS`
    : '-∞ dBFS';

  const kayitYapiliyorMu = kayitDurumu === 'kayit-yapiliyor';
  const tamamlandiMi = kayitDurumu === 'tamamlandi';

  return (
    <section className="grid gap-4 border border-muted/30 bg-panel p-5">
      <header className="flex items-center justify-between border-b border-muted/20 pb-3">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
            Modül 01–02
          </h2>
          <p className="text-lg font-semibold text-ink">
            Ses Yakalama &amp; Waveform Normalizasyonu
          </p>
        </div>
        <div className="font-veri text-xs text-muted">
          {ornekleneHizi ? `${(ornekleneHizi / 1000).toFixed(1)} kHz` : '— kHz'}
        </div>
      </header>

      {hataMesaji && (
        <div className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {hataMesaji}
        </div>
      )}

      <div className="grid gap-1">
        <span className="text-xs uppercase tracking-wide text-muted">
          Canlı Waveform (filtrelenmiş)
        </span>
        <canvas
          ref={canliCanvasRef}
          width={960}
          height={160}
          className="w-full border border-muted/20 bg-canvas"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 font-veri text-sm">
        <div className="flex items-center justify-between border border-muted/20 px-3 py-2">
          <span className="text-muted">RMS</span>
          <span className="text-ink">{rmsDBGoster}</span>
        </div>
        <div className="flex items-center justify-between border border-muted/20 px-3 py-2">
          <span className="text-muted">Peak</span>
          <span className="text-ink">{peakDBGoster}</span>
        </div>
      </div>

      <div className="flex gap-3">
        {!kayitYapiliyorMu ? (
          <button
            type="button"
            onClick={baslat}
            className="border border-accent px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-canvas"
          >
            Kaydı Başlat
          </button>
        ) : (
          <button
            type="button"
            onClick={durdur}
            className="border border-red-400/60 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/10"
          >
            Kaydı Durdur
          </button>
        )}

        {tamamlandiMi && (
          <button
            type="button"
            onClick={sifirla}
            className="border border-muted/30 px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Sıfırla
          </button>
        )}
      </div>

      {tamamlandiMi && (
        <div className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-muted">
            Normalize Edilmiş Waveform (RMS hedefli kazanç uygulandı)
          </span>
          <canvas
            ref={normalizeCanvasRef}
            width={960}
            height={160}
            className="w-full border border-muted/20 bg-canvas"
          />
          {normalizasyonOzeti && (
            <p className="font-veri text-xs text-muted">
              Giriş RMS: {dBFSDonustur(normalizasyonOzeti.girisRMS).toFixed(1)} dBFS · Giriş
              Peak: {dBFSDonustur(normalizasyonOzeti.girisPeak).toFixed(1)} dBFS · Uygulanan
              kazanç: {normalizasyonOzeti.kazanc.toFixed(2)}x
            </p>
          )}
        </div>
      )}

      <div className="border border-dashed border-muted/30 px-3 py-2 text-xs text-muted">
        Modül 03 (kelime bazlı stres tespiti) bu bileşenin transkript panelini besleyecek
        şekilde hazırlanıyor — bkz. <code className="font-veri">src/lib/types.ts</code>.
      </div>
    </section>
  );
}