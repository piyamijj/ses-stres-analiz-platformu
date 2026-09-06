/**
 * Ses Stres Analiz Platformu — Paylaşılan Tip Tanımlamaları
 * 
 * Bu dosya, platform genelinde kullanılan veri yapılarını ve Modül 3 (AI kelime bazlı
 * stres tespiti) için gerekli olan veri şemalarını tanımlar.
 */

/**
 * Ses kaydı veya analiz işlemi sırasında kelime bazlı zaman damgası ve
 * akustik stres metriklerini barındıran yapı.
 */
export interface KelimeZamanDamgasi {
  /** Çözümlenen kelime metni */
  kelime: string;
  
  /** Kelimenin ses kaydındaki başlangıç zamanı (saniye cinsinden) */
  baslangicSaniye: number;
  
  /** Kelimenin ses kaydındaki bitiş zamanı (saniye cinsinden) */
  bitisSaniye: number;
  
  /** 
   * AI modülü tarafından hesaplanan stres yoğunluk skoru (0 - 100 arası).
   * Değer yükseldikçe stres seviyesi artar.
   */
  stresSkoru?: number;
  
  /** Kelime aralığına ait mikro-akustik analiz özellikleri */
  akustikOzellikler?: {
    /** Ortalama temel frekans (F0) değeri (Hz) */
    ortalamaPitchHz?: number;
    
    /** Frekans periyodundaki mikro-değişim oranı (ses titremesi) */
    jitter?: number;
    
    /** Genlik periyodundaki mikro-değişim oranı (ses kararsızlığı) */
    shimmer?: number;
    
    /** Kelimenin telaffuz hızı / tempo sapması */
    tempoDegisimi?: number;
  };
}

/**
 * Tamamlanmış bir ses kaydının transkripsiyon ve stres analizi sonuç paketi.
 */
export interface SesAnalizSonucu {
  /** Ses kaydının tamamının Türkçe metin dökümü */
  transkript: string;
  
  /** Kelime bazlı zaman damgaları ve stres skorları listesi */
  kelimeler: KelimeZamanDamgasi[];
  
  /** Kaydın tamamı için hesaplanan ağırlıklı genel stres skoru (0 - 100 arası) */
  genelStresSkoru: number;
  
  /** Ses kaydının toplam süresi (saniye cinsinden) */
  sureSaniye: number;
}

/**
 * Ses kayıt ve analiz arayüzünün anlık durum makinesi tipleri.
 */
export type KayitDurumu = 
  | 'beklemede'        // Mikrofon hazır, kayıt başlatılmayı bekliyor
  | 'kayit-yapiliyor'  // Ses aktif olarak yakalanıyor ve analiz ediliyor
  | 'islemde'          // Kayıt durduruldu, normalizasyon ve AI analizi yapılıyor
  | 'tamamlandi'       // Analiz başarıyla bitti, sonuçlar ekranda
  | 'hata';            // Mikrofon izni reddedildi veya işlem sırasında hata oluştu

/**
 * Gerçek zamanlı ses yakalama sırasında hesaplanan anlık genlik metrikleri.
 */
export interface CanliSesMetrikleri {
  /** Doğrusal RMS (Root Mean Square) genlik değeri (0.0 - 1.0 arası) */
  rms: number;
  
  /** Doğrusal Peak (Tepe Noktası) genlik değeri (0.0 - 1.0 arası) */
  peak: number;
  
  /** RMS değerinin desibel cinsinden karşılığı (dBFS, 0 dBFS maksimumdur) */
  rmsDB: number;
  
  /** Peak değerinin desibel cinsinden karşılığı (dBFS, 0 dBFS maksimumdur) */
  peakDB: number;
}