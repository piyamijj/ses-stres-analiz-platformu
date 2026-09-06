/**
 * RMS (Root Mean Square) ve Peak tabanlı ses normalizasyonu yardımcıları.
 *
 * Bu modül, ham PCM örneklem dizileri (-1..1 aralığında Float32Array)
 * üzerinde çalışır ve waveform'u matematiksel olarak ölçeklendirmek için
 * gereken temel hesaplamaları sağlar. Amaç: farklı mikrofonlardan veya farklı
 * konuşma seviyelerinden gelen kayıtları, kırpılma (clipping) oluşturmadan
 * ortak bir referans seviyesine (hedef RMS) taşımaktır.
 */

/** normalizeEt() fonksiyonunun döndürdüğü sonuç kümesi. */
export interface NormalizasyonSonucu {
  /** Normalize edilmiş örneklemler (-1..1 aralığında Float32Array). */
  ornekler: Float32Array;
  /** Uygulanan kazanç (gain) çarpanı. */
  kazanc: number;
  /** Girişteki RMS değeri (normalize öncesi, doğrusal genlik). */
  girisRMS: number;
  /** Girişteki peak (mutlak en yüksek genlik) değeri (normalize öncesi). */
  girisPeak: number;
}

/**
 * Bir örneklem bloğunun RMS (etkin/ortalama) genliğini hesaplar.
 * RMS, sinyalin algılanan ses yüksekliğine (loudness) peak değerinden daha
 * yakın bir ölçüdür; bu yüzden normalizasyon hedefi olarak kullanılır.
 * Boş dizi için 0 döner.
 */
export function hesaplaRMS(ornekler: Float32Array): number {
  if (ornekler.length === 0) return 0;

  let toplamKare = 0;
  for (let i = 0; i < ornekler.length; i++) {
    toplamKare += ornekler[i] * ornekler[i];
  }
  return Math.sqrt(toplamKare / ornekler.length);
}

/**
 * Bir örneklem bloğunun peak (mutlak en yüksek) genliğini hesaplar.
 * Kırpılmayı (clipping) önlemek için kazanç sınırlaması bu değere göre
 * yapılır.
 */
export function hesaplaPeak(ornekler: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < ornekler.length; i++) {
    const mutlakDeger = Math.abs(ornekler[i]);
    if (mutlakDeger > peak) peak = mutlakDeger;
  }
  return peak;
}

/**
 * Doğrusal genliği (0..1) dBFS (decibel full scale) değerine çevirir.
 * dBFS, ses mühendisliğinde standart bir seviye gösterimidir; arayüzdeki
 * sayısal göstergeler (RMS/Peak okumaları) bu birimle sunulur.
 * 0 veya negatif girişler için -Infinity döner (sessizlik / geçersiz giriş).
 */
export function dBFSDonustur(dogrusalDeger: number): number {
  if (dogrusalDeger <= 0) return -Infinity;
  return 20 * Math.log10(dogrusalDeger);
}

/**
 * Örneklemleri hedef RMS seviyesine göre normalize eder.
 *
 * Kazanç, iki sınır tarafından korunur:
 *  1. Kırpılma koruması: kazanç uygulandığında peak değeri 0.98'i
 *     (dijital tavana yakın ama onu aşmayan bir güvenlik payı) geçmeyecek
 *     şekilde sınırlandırılır. Bu, çok sessiz bir kayıtta hedef RMS'e
 *     ulaşmaya çalışırken ani zirvelerin (peak) dijital kırpılmaya
 *     (clipping/distortion) yol açmasını engeller.
 *  2. Maksimum kazanç sınırı: aşırı sessiz veya neredeyse boş kayıtlarda
 *     gürültünün aşırı yükseltilmesini (gain ile birlikte gürültü tabanının
 *     da yükselmesini) önlemek için bir üst sınır konur.
 *
 * @param ornekler Ham örneklemler (-1..1 aralığında Float32Array).
 * @param hedefRMS Hedeflenen RMS seviyesi (doğrusal genlik, varsayılan 0.2).
 * @param maksimumKazanc Uygulanabilecek en yüksek kazanç çarpanı (varsayılan 12).
 */
export function normalizeEt(
  ornekler: Float32Array,
  hedefRMS = 0.2,
  maksimumKazanc = 12
): NormalizasyonSonucu {
  const girisRMS = hesaplaRMS(ornekler);
  const girisPeak = hesaplaPeak(ornekler);

  // Sessizlik veya geçersiz giriş: kazanç uygulamadan orijinali döndür.
  if (girisRMS === 0 || girisPeak === 0) {
    return {
      ornekler: new Float32Array(ornekler),
      kazanc: 1,
      girisRMS,
      girisPeak,
    };
  }

  let kazanc = hedefRMS / girisRMS;

  // Kırpılmayı önlemek için: kazanç uygulandığında peak 0.98'i geçmesin.
  const peakSiniriKazanci = 0.98 / girisPeak;
  kazanc = Math.min(kazanc, peakSiniriKazanci, maksimumKazanc);
  kazanc = Math.max(kazanc, 0.0001);

  const cikis = new Float32Array(ornekler.length);
  for (let i = 0; i < ornekler.length; i++) {
    cikis[i] = ornekler[i] * kazanc;
  }

  return { ornekler: cikis, kazanc, girisRMS, girisPeak };
}