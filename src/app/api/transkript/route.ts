/**
 * @file route.ts
 * @description Ses Stres Analiz Platformu — Modül 03 transkripsiyon backend'i.
 *
 * Bu uç nokta, kaydedilmiş bir ses parçasını ('ses' adlı form-data alanı olarak)
 * kabul eder ve Groq'un Whisper-uyumlu API'si üzerinden, kelime bazlı zaman
 * damgalarıyla (word-level timestamps) birlikte metne çevirir. GROQ_API_KEY_1..5
 * ortam değişkenlerinde tanımlı, ücretsiz katmandaki en fazla 5 Groq API anahtarı
 * arasında otomatik rotasyon/fallback uygulanarak rate-limit (429) hatalarına karşı
 * dayanıklılık sağlanır (bkz. src/lib/ai/anahtarRotasyonu.ts).
 *
 * Bu uç nokta hem standart web derlemesi (Vercel, aynı origin) hem de Capacitor ile
 * paketlenmiş Android uygulaması (farklı origin, ağ üzerinden bu paylaşılan backend'e
 * istek atar — bkz. src/lib/config.ts) tarafından ortak olarak kullanılır.
 *
 * ÖNEMLİ: Bu uç nokta yalnızca transkript metnini ve kelime bazlı zaman damgalarını
 * döndürür; stres skorunu HESAPLAMAZ. Akustik özellik çıkarımı (pitch/jitter/shimmer
 * ve stres skoru) İSTEMCİ tarafında, yerel olarak decode edilmiş ses tamponu
 * üzerinden yapılır (bkz. src/lib/audio/akustikOzellikler.ts) — böylece ağır akustik
 * matematik sunucusuz fonksiyonun üzerine yüklenmez ve ses dosyasının tekrar tekrar
 * yüklenmesine gerek kalmaz.
 */

import { NextRequest, NextResponse } from 'next/server';
import { groqAnahtarHavuzu } from '@/lib/ai/ortamAnahtarlari';
import { havuzIleCagriYap } from '@/lib/ai/anahtarRotasyonu';

export const runtime = 'nodejs';
export const maxDuration = 60;

// CORS başlıkları kasıtlı olarak geniş tutuldu: Capacitor ile paketlenmiş Android
// uygulaması farklı bir origin'den (ör. https://localhost veya capacitor://localhost)
// bu Vercel'de barındırılan uç noktayı çağırmak zorunda. Bu uç nokta çerez/oturum
// tabanlı kimlik doğrulama KULLANMAZ — yalnızca sunucuda tutulan, rotasyonlu API
// anahtarlarını kullanır, bu yüzden geniş CORS burada güvenlik riski oluşturmaz.
const CORS_BASLIKLARI = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_BASLIKLARI });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sesDosyasi = formData.get('ses');

    if (!sesDosyasi || !(sesDosyasi instanceof Blob)) {
      return NextResponse.json(
        { hata: 'Ses dosyası bulunamadı. "ses" alanı (form-data) gerekli.' },
        { status: 400, headers: CORS_BASLIKLARI }
      );
    }

    let havuz;
    try {
      havuz = groqAnahtarHavuzu();
    } catch (e) {
      return NextResponse.json(
        { hata: e instanceof Error ? e.message : 'Anahtar havuzu okunamadı.' },
        { status: 500, headers: CORS_BASLIKLARI }
      );
    }

    const { sonuc, kullanilanAnahtarIndeksi, denemeSayisi } = await havuzIleCagriYap(
      havuz,
      async (anahtar) => {
        const groqFormData = new FormData();
        groqFormData.append('file', sesDosyasi, 'kayit.webm');
        groqFormData.append('model', 'whisper-large-v3-turbo');
        groqFormData.append('response_format', 'verbose_json');
        groqFormData.append('timestamp_granularities[]', 'word');
        groqFormData.append('language', 'tr');

        const yanit = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${anahtar}` },
          body: groqFormData,
        });

        if (!yanit.ok) {
          const hataMetni = await yanit.text();
          throw new Error(`Groq API hatası (HTTP ${yanit.status}): ${hataMetni.slice(0, 300)}`);
        }

        return yanit.json();
      }
    );

    const kelimeler = Array.isArray(sonuc.words)
      ? sonuc.words.map((k: any) => ({
          kelime: k.word,
          baslangicSaniye: k.start,
          bitisSaniye: k.end,
        }))
      : // Geriye dönük uyumluluk / zarif bozulma (graceful degradation) yolu:
        // Groq'un word-level granülerliği desteklenmediği veya beklenmedik bir yanıt
        // şekli döndüğü durumlarda, segment metnini boşluklara göre kabaca kelimelere
        // bölüp segment süresini bu kelimeler arasında eşit olarak dağıtarak yaklaşık
        // zaman damgaları üretiyoruz. Bu, birincil (words) yol DEĞİLDİR — yalnızca
        // arayüzün tamamen boş kalmaması için bir yedektir.
        (sonuc.segments || []).flatMap((segment: any) => {
          const kelimeListesi = String(segment.text || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);

          if (kelimeListesi.length === 0) return [];

          const toplamSure = segment.end - segment.start;
          const kelimeSuresi = toplamSure / kelimeListesi.length;

          return kelimeListesi.map((kelime: string, i: number) => ({
            kelime,
            baslangicSaniye: segment.start + i * kelimeSuresi,
            bitisSaniye: segment.start + (i + 1) * kelimeSuresi,
          }));
        });

    return NextResponse.json(
      {
        transkript: sonuc.text || '',
        kelimeler,
        kullanilanAnahtarIndeksi,
        denemeSayisi,
      },
      { headers: CORS_BASLIKLARI }
    );
  } catch (hata) {
    console.error('[api/transkript] Hata:', hata);
    return NextResponse.json(
      {
        hata:
          hata instanceof Error
            ? hata.message
            : 'Transkripsiyon sırasında bilinmeyen bir hata oluştu.',
      },
      { status: 502, headers: CORS_BASLIKLARI }
    );
  }
}