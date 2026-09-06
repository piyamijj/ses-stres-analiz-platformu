/**
 * @file anahtarRotasyonu.ts
 * @description Sunucu tarafında çalışan, API anahtarlarını (Gemini, Groq vb.) round-robin (sırayla)
 * döndüren ve 429 (Rate Limit) hatası alındığında ilgili anahtarı geçici olarak soğutmaya (cooldown)
 * alan genel amaçlı anahtar rotasyon yöneticisi.
 * 
 * GÜVENLİK UYARISI: Bu modül yalnızca sunucu tarafında (Route Handler, Server Action vb.) çalışmalıdır.
 * İstemci (client) tarafındaki bileşenlerden doğrudan içe aktarılmamalıdır.
 */

export interface AnahtarHavuzu {
  anahtarlar: string[];
  imlec: number;
  sogumaBitisleri: Map<string, number>;
}

export interface RotasyonSonucu<T> {
  sonuc: T;
  kullanilanAnahtarIndeksi: number;
  denemeSayisi: number;
}

/**
 * Verilen API anahtarı dizisinden yeni bir rotasyon havuzu oluşturur.
 * Boş veya sadece boşluk karakterlerinden oluşan anahtarları eler.
 * 
 * @param anahtarlar API anahtarlarını içeren dizi
 * @returns AnahtarHavuzu nesnesi
 */
export function anahtarHavuzuOlustur(anahtarlar: string[]): AnahtarHavuzu {
  const gecerliAnahtarlar = anahtarlar
    .map(k => k.trim())
    .filter(k => k.length > 0);

  if (gecerliAnahtarlar.length === 0) {
    throw new Error("API anahtar havuzu oluşturulamadı: Geçerli bir anahtar bulunamadı.");
  }

  return {
    anahtarlar: gecerliAnahtarlar,
    imlec: 0,
    sogumaBitisleri: new Map<string, number>()
  };
}

/**
 * Havuzdaki anahtarları, mevcut round-robin imlecinden başlayarak sırayla döndürür.
 * Soğutma süresi (cooldown) devam eden anahtarları atlar.
 * Eğer tüm anahtarlar soğutmadaysa, son çare olarak tüm anahtarları geri döndürür.
 * 
 * @param havuz Anahtar havuzu
 * @returns Sıralanmış ve filtrelenmiş anahtar dizisi
 */
export function siradakiAnahtarlar(havuz: AnahtarHavuzu): string[] {
  const simdi = Date.now();
  const n = havuz.anahtarlar.length;
  const sirali: string[] = [];
  const sogumadaOlanlar: string[] = [];

  for (let i = 0; i < n; i++) {
    const indeks = (havuz.imlec + i) % n;
    const anahtar = havuz.anahtarlar[indeks];
    const bitis = havuz.sogumaBitisleri.get(anahtar) || 0;

    if (bitis > simdi) {
      sogumadaOlanlar.push(anahtar);
    } else {
      sirali.push(anahtar);
    }
  }

  // Eğer tüm anahtarlar soğutmadaysa, hiçbirini atlamadan hepsini dene (son çare)
  if (sirali.length === 0) {
    for (let i = 0; i < n; i++) {
      const indeks = (havuz.imlec + i) % n;
      sirali.push(havuz.anahtarlar[indeks]);
    }
  }

  return sirali;
}

/**
 * Bir anahtarı belirli bir süre boyunca soğutmaya (cooldown) alır.
 * Bu anahtar, soğutma süresi bitene kadar siradakiAnahtarlar çağrılarında öncelikli olarak atlanır.
 * 
 * @param havuz Anahtar havuzu
 * @param anahtar Soğutulacak anahtar
 * @param saniyeSure Soğutma süresi (saniye cinsinden, varsayılan 60)
 */
export function anahtarSogutmayaAl(havuz: AnahtarHavuzu, anahtar: string, saniyeSure = 60): void {
  havuz.sogumaBitisleri.set(anahtar, Date.now() + saniyeSure * 1000);
}

/**
 * Round-robin imlecini bir sonraki anahtara kaydırır.
 * Her çağrı denemesinden sonra (başarılı veya başarısız) yükü dağıtmak için çağrılmalıdır.
 * 
 * @param havuz Anahtar havuzu
 */
export function imleciIlerlet(havuz: AnahtarHavuzu): void {
  havuz.imlec = (havuz.imlec + 1) % havuz.anahtarlar.length;
}

/**
 * Havuzdaki anahtarları sırayla kullanarak verilen asenkron işlemi gerçekleştirir.
 * Rate limit (429) hatası alındığında anahtarı soğutmaya alır ve sıradaki anahtarla devam eder.
 * Tüm anahtarlar tükenirse toplu bir hata fırlatır.
 * 
 * @param havuz Anahtar havuzu
 * @param cagriFn Her anahtar için çalıştırılacak asenkron fonksiyon
 * @param opts Hata kontrol seçenekleri
 * @returns Başarılı çağrının sonucu ve kullanılan anahtar bilgileri
 */
export async function havuzIleCagriYap<T>(
  havuz: AnahtarHavuzu,
  cagriFn: (anahtar: string) => Promise<T>,
  opts?: { rateLimitKontrolu?: (hata: unknown) => boolean }
): Promise<RotasyonSonucu<T>> {
  const adaylar = siradakiAnahtarlar(havuz);
  let sonHata: unknown = null;
  let denemeSayisi = 0;

  const varsayilanRateLimitKontrolu = (hata: unknown): boolean => {
    if (!hata) return false;
    const mesaj = String(hata).toLowerCase();
    return (
      mesaj.includes("429") ||
      mesaj.includes("rate limit") ||
      mesaj.includes("quota") ||
      mesaj.includes("too many requests")
    );
  };

  const isRateLimit = opts?.rateLimitKontrolu || varsayilanRateLimitKontrolu;

  for (const anahtar of adaylar) {
    denemeSayisi++;
    const anahtarIndeksi = havuz.anahtarlar.indexOf(anahtar);

    try {
      const sonuc = await cagriFn(anahtar);
      // Başarılı çağrı sonrası imleci ilerlet ki bir sonraki istek farklı anahtarla başlasın
      imleciIlerlet(havuz);
      return {
        sonuc,
        kullanilanAnahtarIndeksi: anahtarIndeksi,
        denemeSayisi
      };
    } catch (hata) {
      sonHata = hata;
      imleciIlerlet(havuz);

      if (isRateLimit(hata)) {
        // Rate limit hatası alındı, anahtarı 60 saniye soğutmaya al
        anahtarSogutmayaAl(havuz, anahtar, 60);
      }
      // Diğer hata türlerinde de (ör. geçici ağ hatası) havuzdaki diğer anahtarları denemeye devam et
    }
  }

  // Havuzdaki tüm anahtarlar denendi ve başarısız olundu
  const hataMesaji = sonHata instanceof Error ? sonHata.message : String(sonHata);
  throw new Error(
    `API anahtar havuzundaki tüm anahtarlar (${denemeSayisi} adet) denendi ancak başarısız olundu. Son hata: ${hataMesaji}`
  );
}