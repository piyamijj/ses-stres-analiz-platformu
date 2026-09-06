/**
 * @file ortamAnahtarlari.ts
 * @description Bu dosya yalnızca sunucu tarafında (Route Handler / Server Action) çalışır.
 * process.env üzerinden okunan API anahtarları asla istemciye (client component) sızdırılmamalıdır.
 */

import { anahtarHavuzuOlustur, type AnahtarHavuzu } from './anahtarRotasyonu';

/**
 * Belirtilen önek adına sahip ortam değişkenlerini (örn. GEMINI_API_KEY_1, GEMINI_API_KEY_2...)
 * sırayla okur ve boş olmayan değerleri bir dizi olarak toplar.
 * 
 * @param onEkAdi Ortam değişkeni öneki (örn. 'GEMINI_API_KEY')
 * @param adet Okunacak maksimum değişken sayısı (varsayılan: 5)
 * @returns Boş olmayan API anahtarlarının dizisi
 */
function ortamDegiskenindenHavuzOku(onEkAdi: string, adet = 5): string[] {
  const anahtarlar: string[] = [];
  for (let i = 1; i <= adet; i++) {
    const deger = process.env[`${onEkAdi}_${i}`];
    if (deger && deger.trim() !== '') {
      anahtarlar.push(deger.trim());
    }
  }
  return anahtarlar;
}

/**
 * GEMINI_API_KEY_1..5 ortam değişkenlerinden bir anahtar havuzu oluşturur.
 * Geriye dönük uyumluluk için tekil GEMINI_API_KEY değişkenini de havuzun sonuna ekler.
 * 
 * @returns Gemini API anahtar havuzu nesnesi
 * @throws {Error} Havuzda hiç geçerli anahtar bulunamazsa Türkçe hata fırlatır.
 */
export function gemeniAnahtarHavuzu(): AnahtarHavuzu {
  const anahtarlar = ortamDegiskenindenHavuzOku('GEMINI_API_KEY', 5);
  
  // Geriye dönük uyumluluk için tekil anahtarı da kontrol et
  const tekilAnahtar = process.env.GEMINI_API_KEY;
  if (tekilAnahtar && tekilAnahtar.trim() !== '') {
    const temizTekil = tekilAnahtar.trim();
    if (!anahtarlar.includes(temizTekil)) {
      anahtarlar.push(temizTekil);
    }
  }

  if (anahtarlar.length === 0) {
    throw new Error('GEMINI_API_KEY_1..5 veya GEMINI_API_KEY ortam değişkenlerinden hiçbiri tanımlı değil.');
  }

  return anahtarHavuzuOlustur(anahtarlar);
}

/**
 * GROQ_API_KEY_1..5 ortam değişkenlerinden bir anahtar havuzu oluşturur.
 * Geriye dönük uyumluluk için tekil GROQ_API_KEY değişkenini de havuzun sonuna ekler.
 * 
 * @returns Groq API anahtar havuzu nesnesi
 * @throws {Error} Havuzda hiç geçerli anahtar bulunamazsa Türkçe hata fırlatır.
 */
export function groqAnahtarHavuzu(): AnahtarHavuzu {
  const anahtarlar = ortamDegiskenindenHavuzOku('GROQ_API_KEY', 5);

  // Geriye dönük uyumluluk için tekil anahtarı da kontrol et
  const tekilAnahtar = process.env.GROQ_API_KEY;
  if (tekilAnahtar && tekilAnahtar.trim() !== '') {
    const temizTekil = tekilAnahtar.trim();
    if (!anahtarlar.includes(temizTekil)) {
      anahtarlar.push(temizTekil);
    }
  }

  if (anahtarlar.length === 0) {
    throw new Error('GROQ_API_KEY_1..5 veya GROQ_API_KEY ortam değişkenlerinden hiçbiri tanımlı değil.');
  }

  return anahtarHavuzuOlustur(anahtarlar);
}