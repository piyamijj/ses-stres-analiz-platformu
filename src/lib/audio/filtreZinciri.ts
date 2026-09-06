/**
 * Ses Filtre Zinciri Modülü
 * 
 * Bu modül, Web Audio API BiquadFilterNode nesnelerini kullanarak mikrofon girişindeki
 * arka plan gürültülerini (klima uğultusu, şebeke gürültüsü, yüksek frekanslı tıslama)
 * filtrelemek için bir zincir oluşturur.
 * 
 * İnsan konuşma sesi frekans bandı genel olarak 80 Hz ile 8000 Hz arasındadır.
 * Bu nedenle:
 *  1. Highpass (Yüksek Geçiren) Filtre: 80 Hz altındaki mekanik uğultuları ve rüzgar seslerini keser.
 *  2. Notch (Çentik) Filtre: 50 Hz şebeke elektriği hum gürültüsünü (mains hum) dar bir bantta yok eder.
 *  3. Lowpass (Alçak Geçiren) Filtre: 8000 Hz üzerindeki yüksek frekanslı dijital tıslamaları ve gürültüleri filtreler.
 * 
 * Kullanım:
 *   const zincir = sesFiltreZinciriOlustur(audioContext);
 *   mikrofonKaynagi.connect(zincir.giris);
 *   zincir.cikis.connect(analizDugumu);
 */

export interface FiltreZinciriSecenekleri {
  /** Yüksek geçiren filtre kesim frekansı (Varsayılan: 80 Hz) */
  highpassFrekans?: number;
  /** Alçak geçiren filtre kesim frekansı (Varsayılan: 8000 Hz) */
  lowpassFrekans?: number;
  /** Highpass filtre kalite faktörü Q (Varsayılan: 0.707 - Butterworth tepkisi) */
  highpassQ?: number;
  /** Lowpass filtre kalite faktörü Q (Varsayılan: 0.707 - Butterworth tepkisi) */
  lowpassQ?: number;
}

export interface FiltreZinciri {
  /** Zincirin giriş noktası (Highpass filtre) */
  giris: BiquadFilterNode;
  /** Zincirin çıkış noktası (Lowpass filtre) */
  cikis: BiquadFilterNode;
  /** Highpass filtre düğümü */
  highpass: BiquadFilterNode;
  /** Şebeke gürültüsü (50 Hz) çentik filtre düğümü */
  notch: BiquadFilterNode;
  /** Lowpass filtre düğümü */
  lowpass: BiquadFilterNode;
}

/**
 * Belirtilen AudioContext üzerinde gürültü filtreleme zincirini oluşturur ve birbirine bağlar.
 * 
 * @param audioContext Web Audio API bağlamı
 * @param secenekler Filtre frekans ve Q parametreleri
 * @returns Filtre zinciri giriş, çıkış ve ara düğümleri
 */
export function sesFiltreZinciriOlustur(
  audioContext: AudioContext,
  secenekler: FiltreZinciriSecenekleri = {}
): FiltreZinciri {
  const {
    highpassFrekans = 80,
    lowpassFrekans = 8000,
    highpassQ = 0.707,
    lowpassQ = 0.707,
  } = secenekler;

  // 1. Highpass Filtre: Alçak frekanslı mekanik gürültüleri temizler
  const highpass = audioContext.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = highpassFrekans;
  highpass.Q.value = highpassQ;

  // 2. Notch Filtre: 50 Hz şebeke gürültüsünü (mains hum) dar bir bantta bastırır
  const notch = audioContext.createBiquadFilter();
  notch.type = 'notch';
  notch.frequency.value = 50;
  notch.Q.value = 30.0; // Yüksek Q değeri dar bir çentik oluşturarak konuşma sesini bozmaz

  // 3. Lowpass Filtre: Yüksek frekanslı tıslama ve gürültüleri temizler
  const lowpass = audioContext.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = lowpassFrekans;
  lowpass.Q.value = lowpassQ;

  // Zinciri birbirine bağla: Highpass -> Notch -> Lowpass
  highpass.connect(notch);
  notch.connect(lowpass);

  return {
    giris: highpass,
    cikis: lowpass,
    highpass,
    notch,
    lowpass,
  };
}