import { hesaplaRMS, dBFSDonustur } from './normalizasyon';

/**
 * Zaman alanında otokorelasyon (autocorrelation) yöntemiyle temel frekans (F0 / Pitch) tespiti.
 * İnsan konuşma sesi için tipik aralık olan 75 Hz - 400 Hz arasını tarar.
 * 
 * @param ornekler Raw Float32Array PCM ses örnekleri (-1..1 aralığında)
 * @param ornekleHizi Ses örnekleme hızı (ör. 48000 Hz)
 * @param minHz Taranacak en düşük frekans (varsayılan 75 Hz)
 * @param maxHz Taranacak en yüksek frekans (varsayılan 400 Hz)
 * @returns Tespit edilen frekans (Hz cinsinden) veya sessizlik/belirsizlik durumunda null
 */
export function otokorelasyonPitchTespitEt(
  ornekler: Float32Array,
  ornekleHizi: number,
  minHz = 75,
  maxHz = 400
): number | null {
  const n = ornekler.length;
  const minLag = Math.floor(ornekleHizi / maxHz);
  const maxLag = Math.floor(ornekleHizi / minHz);

  if (n < maxLag * 2) {
    // Örnek sayısı güvenilir bir analiz için en düşük frekans periyodunun en az iki katı olmalıdır
    return null;
  }

  let enIyiLag = -1;
  let enIyiKorelasyon = -1;

  // Lag taraması
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let sumSqA = 0;
    let sumSqB = 0;

    // Sinyalin kendisiyle kaydırılmış hali arasındaki korelasyonu hesapla
    const limit = n - lag;
    for (let i = 0; i < limit; i++) {
      const a = ornekler[i];
      const b = ornekler[i + lag];
      sum += a * b;
      sumSqA += a * a;
      sumSqB += b * b;
    }

    if (sumSqA === 0 || sumSqB === 0) continue;

    // Normalize edilmiş otokorelasyon katsayısı
    const korelasyon = sum / Math.sqrt(sumSqA * sumSqB);

    if (korelasyon > enIyiKorelasyon) {
      enIyiKorelasyon = korelasyon;
      enIyiLag = lag;
    }
  }

  // Güven eşiği (0.3). Bu eşiğin altındaki korelasyonlar gürültü veya sessizlik kabul edilir.
  if (enIyiKorelasyon > 0.3 && enIyiLag !== -1) {
    return ornekleHizi / enIyiLag;
  }

  return null;
}

/**
 * Büyük bir ses tamponunu (buffer) belirtilen milisaniye uzunluğunda ardışık karelere böler.
 * 
 * @param ornekler Raw Float32Array PCM ses örnekleri
 * @param ornekleHizi Ses örnekleme hızı (Hz)
 * @param kareSuresiMs Her bir karenin hedef süresi (milisaniye, varsayılan 20ms)
 * @returns Float32Array kare dizisi
 */
export function kareyeBol(
  ornekler: Float32Array,
  ornekleHizi: number,
  kareSuresiMs = 20
): Float32Array[] {
  const kareUzunlugu = Math.round((ornekleHizi * kareSuresiMs) / 1000);
  const kareler: Float32Array[] = [];
  const n = ornekler.length;

  for (let i = 0; i < n; i += kareUzunlugu) {
    const kalan = n - i;
    // Eğer son kare hedef uzunluğun yarısından kısaysa dahil etme (kırp)
    if (kalan < kareUzunlugu / 2) {
      break;
    }
    const bitis = Math.min(i + kareUzunlugu, n);
    kareler.push(ornekler.subarray(i, bitis));
  }

  return kareler;
}

export interface JitterShimmerSonucu {
  jitterYuzde: number;
  shimmerYuzde: number;
  frameSayisi: number;
}

/**
 * Ses sinyalindeki mikro-frekans dalgalanmalarını (Jitter) ve mikro-genlik dalgalanmalarını (Shimmer) hesaplar.
 * Bu metrikler ses tellerindeki gerginlik ve stres seviyesinin klasik akustik göstergeleridir.
 * 
 * @param ornekler Raw Float32Array PCM ses örnekleri
 * @param ornekleHizi Ses örnekleme hızı (Hz)
 */
export function jitterVeShimmerHesapla(
  ornekler: Float32Array,
  ornekleHizi: number
): JitterShimmerSonucu {
  // Sesi ~20ms'lik kısa pencerelere bölüyoruz
  const kareler = kareyeBol(ornekler, ornekleHizi, 20);
  
  const periyotlar: number[] = [];
  const genlikler: number[] = [];

  for (const kare of kareler) {
    // Her kare için pitch (F0) hesapla
    const pitch = otokorelasyonPitchTespitEt(kare, ornekleHizi);
    
    if (pitch !== null && pitch > 0) {
      // Periyot = 1 / Frekans (saniye cinsinden)
      periyotlar.push(1 / pitch);
      
      // Karenin maksimum mutlak genliğini (peak amplitude) bul
      let maxGenlik = 0;
      for (let i = 0; i < kare.length; i++) {
        const absVal = Math.abs(kare[i]);
        if (absVal > maxGenlik) {
          maxGenlik = absVal;
        }
      }
      genlikler.push(maxGenlik);
    }
  }

  const n = periyotlar.length;
  if (n < 2) {
    // Karşılaştırma yapabilmek için en az 2 sesli (voiced) kare gereklidir
    return { jitterYuzde: 0, shimmerYuzde: 0, frameSayisi: 0 };
  }

  // Jitter (Relative Average Perturbation proxy): Ardışık periyot farklarının ortalamasının, ortalama periyoda oranı
  let toplamPeriyotFarki = 0;
  let toplamPeriyot = 0;
  for (let i = 0; i < n - 1; i++) {
    toplamPeriyotFarki += Math.abs(periyotlar[i] - periyotlar[i + 1]);
    toplamPeriyot += periyotlar[i];
  }
  toplamPeriyot += periyotlar[n - 1];
  const ortalamaPeriyot = toplamPeriyot / n;
  const ortalamaPeriyotFarki = toplamPeriyotFarki / (n - 1);
  const jitterYuzde = ortalamaPeriyot > 0 ? (ortalamaPeriyotFarki / ortalamaPeriyot) * 100 : 0;

  // Shimmer: Ardışık genlik farklarının ortalamasının, ortalama genliğe oranı
  let toplamGenlikFarki = 0;
  let toplamGenlik = 0;
  for (let i = 0; i < n - 1; i++) {
    toplamGenlikFarki += Math.abs(genlikler[i] - genlikler[i + 1]);
    toplamGenlik += genlikler[i];
  }
  toplamGenlik += genlikler[n - 1];
  const ortalamaGenlik = toplamGenlik / n;
  const ortalamaGenlikFarki = toplamGenlikFarki / (n - 1);
  const shimmerYuzde = ortalamaGenlik > 0 ? (ortalamaGenlikFarki / ortalamaGenlik) * 100 : 0;

  return {
    jitterYuzde,
    shimmerYuzde,
    frameSayisi: n
  };
}

export interface KelimeAkustikGirdi {
  ornekler: Float32Array;
  ornekleHizi: number;
  oncekiKelimeOrtalamaPitchHz?: number | null;
}

export interface KelimeAkustikCiktisi {
  pitchHz: number | null;
  jitterYuzde: number;
  shimmerYuzde: number;
  rmsDB: number;
  pitchSapmasiHz: number | null;
  stresSkoru: number;
}

/**
 * Belirli bir kelime aralığına ait ses örneğinin akustik özelliklerini çıkarır ve stres skorunu hesaplar.
 */
export function kelimeAkustikOzellikleriCikar(girdi: KelimeAkustikGirdi): KelimeAkustikCiktisi {
  const { ornekler, ornekleHizi, oncekiKelimeOrtalamaPitchHz } = girdi;

  // 1. Temel frekans (Pitch) tespiti
  const pitchHz = otokorelasyonPitchTespitEt(ornekler, ornekleHizi);

  // 2. Jitter ve Shimmer hesaplama
  const { jitterYuzde, shimmerYuzde } = jitterVeShimmerHesapla(ornekler, ornekleHizi);

  // 3. RMS Genlik (Ses şiddeti) hesaplama
  const rms = hesaplaRMS(ornekler);
  const rmsDB = dBFSDonustur(rms);

  // 4. Önceki kelimeye göre pitch sapması (stres anında ani pitch sıçramaları olur)
  const pitchSapmasiHz =
    pitchHz !== null && oncekiKelimeOrtalamaPitchHz
      ? Math.abs(pitchHz - oncekiKelimeOrtalamaPitchHz)
      : null;

  // 5. Akustik özelliklerden stres skoru türetme
  const stresSkoru = kelimeStresSkoruHesapla({
    jitterYuzde,
    shimmerYuzde,
    pitchSapmasiHz,
    rmsDB
  });

  return {
    pitchHz,
    jitterYuzde,
    shimmerYuzde,
    rmsDB,
    pitchSapmasiHz,
    stresSkoru
  };
}

/**
 * ÖNEMLİ AÇIKLAMA:
 * Bu fonksiyon, akustik sinyal özelliklerini (Jitter, Shimmer, Pitch Sapması, RMS) 0-100 aralığında
 * bir stres skoruna dönüştüren matematiksel bir SEZGİSEL (HEURISTIC) algoritmadır.
 * Klinik veya tıbbi olarak doğrulanmış bir teşhis modeli DEĞİLDİR. İlk ürün iterasyonunda stresli
 * kelimeleri görselleştirmek ve AI attention mekanizmasını simüle etmek amacıyla tasarlanmıştır.
 * Gerçek dünya dağıtımlarında, etiketli veri setleriyle kalibre edilmeli veya eğitilmiş bir
 * sınıflandırıcı model ile değiştirilmelidir.
 * 
 * Ağırlık Dağılımı:
 * - Jitter (Mikro-frekans kararsızlığı): %30
 * - Shimmer (Mikro-genlik kararsızlığı): %25
 * - Pitch Sapması (Kelime geçişlerindeki ani ton değişimleri): %25 (Yoksa ağırlığı diğerlerine dağıtılır)
 * - RMS (Ses şiddeti / Bağırma seviyesi): %20
 */
export function kelimeStresSkoruHesapla(ozellikler: {
  jitterYuzde: number;
  shimmerYuzde: number;
  pitchSapmasiHz: number | null;
  rmsDB: number;
}): number {
  const { jitterYuzde, shimmerYuzde, pitchSapmasiHz, rmsDB } = ozellikler;

  // Yardımcı sınırlama fonksiyonu
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
  const linearMap = (val: number, low: number, high: number) => {
    const mapped = ((val - low) / (high - low)) * 100;
    return clamp(mapped, 0, 100);
  };

  // 1. Jitter Skoru: Normal konuşmada jitter %0.5 - %1.5 arasındadır. %3.0 ve üzeri yüksek stres/gerginlik gösterir.
  const jitterSkoru = linearMap(jitterYuzde, 0.5, 3.0);

  // 2. Shimmer Skoru: Normal konuşmada shimmer %2.0 - %5.0 arasındadır. %10.0 ve üzeri yüksek stres gösterir.
  const shimmerSkoru = linearMap(shimmerYuzde, 2.0, 10.0);

  // 3. Pitch Sapması Skoru: Kelimeler arası ani ton sıçramaları. 0 Hz - 60 Hz aralığına map edilir.
  const pitchSapmaSkoru = pitchSapmasiHz !== null ? linearMap(pitchSapmasiHz, 5, 60) : null;

  // 4. RMS (Ses Şiddeti) Skoru: -30 dBFS (fısıltı/sessiz) ile -6 dBFS (yüksek ses/bağırma) aralığına map edilir.
  const rmsSkoru = linearMap(rmsDB, -30, -6);

  // Ağırlıklı birleştirme
  let toplamSkor = 0;
  if (pitchSapmaSkoru !== null) {
    // Pitch sapması mevcutsa standart ağırlıklar
    toplamSkor =
      jitterSkoru * 0.30 +
      shimmerSkoru * 0.25 +
      pitchSapmaSkoru * 0.25 +
      rmsSkoru * 0.20;
  } else {
    // Pitch sapması yoksa (örneğin ilk kelime), onun %25 ağırlığı diğerlerine orantılı dağıtılır
    // Yeni ağırlıklar: Jitter %40, Shimmer %35, RMS %25
    toplamSkor =
      jitterSkoru * 0.40 +
      shimmerSkoru * 0.35 +
      rmsSkoru * 0.25;
  }

  return Math.round(clamp(toplamSkor, 0, 100));
}