'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sesFiltreZinciriOlustur } from '@/lib/audio/filtreZinciri';
import { hesaplaRMS, hesaplaPeak, dBFSDonustur } from '@/lib/audio/normalizasyon';
import type { CanliSesMetrikleri, KayitDurumu } from '@/lib/types';

/**
 * En yüksek standart Web Audio örnekleme hızı (48 kHz).
 * Bu hız, ses analizinde yüksek frekans çözünürlüğü ve hassasiyet sağlar.
 */
const HEDEF_ORNEKLEME_HIZI = 48000;

export function useSesYakalama() {
  const [kayitDurumu, setKayitDurumu] = useState<KayitDurumu>('beklemede');
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);
  const [canliMetrikler, setCanliMetrikler] = useState<CanliSesMetrikleri>({
    rms: 0,
    peak: 0,
    rmsDB: -Infinity,
    peakDB: -Infinity,
  });
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [kayitliBlob, setKayitliBlob] = useState<Blob | null>(null);
  const [ornekleneHizi, setOrnekleneHizi] = useState<number | null>(null);

  // Web Audio API ve kayıt referansları
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const kayitParcalariRef = useRef<Blob[]>([]);
  const animasyonKareRef = useRef<number | null>(null);

  // Gerçek zamanlı ses seviyesi (RMS/Peak) güncelleme döngüsü
  const metrikleriGuncelle = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const veriDizisi = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(veriDizisi);

    const rms = hesaplaRMS(veriDizisi);
    const peak = hesaplaPeak(veriDizisi);

    setCanliMetrikler({
      rms,
      peak,
      rmsDB: dBFSDonustur(rms),
      peakDB: dBFSDonustur(peak),
    });

    animasyonKareRef.current = requestAnimationFrame(metrikleriGuncelle);
  }, []);

  // Ses yakalamayı ve kaydı başlatır
  const baslat = useCallback(async () => {
    setHataMesaji(null);
    setKayitliBlob(null);
    kayitParcalariRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHataMesaji('Bu tarayıcı mikrofon erişimini desteklemiyor.');
      setKayitDurumu('hata');
      return;
    }

    try {
      // Tarayıcının kendi otomatik ses işlemlerini (DSP) devre dışı bırakıyoruz.
      // Böylece kendi filtre zincirimiz (highpass/lowpass/notch) ham ses üzerinde tam kontrol sahibi olur.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: HEDEF_ORNEKLEME_HIZI },
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;

      // AudioContext başlatma (Safari uyumluluğu ile)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({
        sampleRate: HEDEF_ORNEKLEME_HIZI,
      });
      audioContextRef.current = audioContext;
      setOrnekleneHizi(audioContext.sampleRate);

      const kaynak = audioContext.createMediaStreamSource(stream);

      // Özel gürültü filtreleme zincirini oluştur (80 Hz - 8000 Hz konuşma bandı)
      const filtreZinciri = sesFiltreZinciriOlustur(audioContext, {
        highpassFrekans: 80,
        lowpassFrekans: 8000,
      });

      // Gerçek zamanlı görselleştirme için AnalyserNode oluştur
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;
      setAnalyserNode(analyser);

      // Filtrelenmiş sesi kaydetmek için bir hedef (destination) oluşturuyoruz
      const kayitHedefi = audioContext.createMediaStreamDestination();

      // Bağlantıları yap: Kaynak -> Filtre Zinciri -> Analyser & Kayıt Hedefi
      kaynak.connect(filtreZinciri.giris);
      filtreZinciri.cikis.connect(analyser);
      filtreZinciri.cikis.connect(kayitHedefi);

      // Kayıt cihazını filtrelenmiş stream ile başlat
      let secilenTip = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(secilenTip)) {
        secilenTip = 'audio/webm';
      }

      const mediaRecorder = new MediaRecorder(kayitHedefi.stream, {
        mimeType: secilenTip,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          kayitParcalariRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const sesBloğu = new Blob(kayitParcalariRef.current, { type: secilenTip });
        setKayitliBlob(sesBloğu);
        setKayitDurumu('tamamlandi');

        // Kayıt bittiğinde AudioContext'i kapatarak kaynakları serbest bırak
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch((err) => {
            console.error('AudioContext kapatılırken hata oluştu:', err);
          });
          audioContextRef.current = null;
        }
      };

      // Her 250ms'de bir veri parçası tetikle
      mediaRecorder.start(250);
      setKayitDurumu('kayit-yapiliyor');

      // Canlı RMS/Peak metrik döngüsünü başlat
      metrikleriGuncelle();
    } catch (err: any) {
      console.error('Mikrofon başlatma hatası:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setHataMesaji('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından izin verin.');
      } else {
        setHataMesaji('Mikrofon başlatılamadı. Cihazı ve tarayıcı izinlerini kontrol edin.');
      }
      setKayitDurumu('hata');
    }
  }, [metrikleriGuncelle]);

  // Ses yakalamayı ve kaydı durdurur
  const durdur = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (animasyonKareRef.current !== null) {
      cancelAnimationFrame(animasyonKareRef.current);
      animasyonKareRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setAnalyserNode(null);
    setKayitDurumu((eskiDurum) => (eskiDurum === 'hata' ? 'hata' : 'islemde'));
  }, []);

  // Durumu sıfırlar ve yeni kayda hazırlar
  const sifirla = useCallback(() => {
    durdur();
    setKayitDurumu('beklemede');
    setHataMesaji(null);
    setKayitliBlob(null);
    setCanliMetrikler({
      rms: 0,
      peak: 0,
      rmsDB: -Infinity,
      peakDB: -Infinity,
    });
    kayitParcalariRef.current = [];
  }, [durdur]);

  // Bileşen unmount olduğunda kaynakları temizle
  useEffect(() => {
    return () => {
      if (animasyonKareRef.current !== null) {
        cancelAnimationFrame(animasyonKareRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    kayitDurumu,
    hataMesaji,
    canliMetrikler,
    analyserNode,
    kayitliBlob,
    ornekleneHizi,
    baslat,
    durdur,
    sifirla,
  };
}