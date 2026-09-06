/**
 * API taban URL yapılandırması.
 *
 * Bu proje iki ayrı hedefe derlenir:
 *  - Web (Vercel): Next.js sunucusu ve /api/* Route Handler'ları aynı
 *    origin'de çalışır, bu yüzden istekler göreli (relative) yollarla
 *    atılabilir (ör. fetch('/api/transkript')).
 *  - Capacitor/Android (statik export, BUILD_TARGET=capacitor): bu
 *    derlemede yerel API route'u bulunmaz (bkz. next.config.mjs ve
 *    scripts/build-capacitor.sh — statik export sırasında src/app/api
 *    dizini geçici olarak çıkarılır). Paketlenmiş Android uygulaması
 *    bunun yerine ağ üzerinden, Vercel'de barındırılan aynı paylaşılan
 *    backend'e istek atar. Bu durumda derleme zamanında
 *    NEXT_PUBLIC_API_BASE_URL ortam değişkeni Vercel origin'ine
 *    (ör. https://ses-stres-analiz-platformu.vercel.app) ayarlanır.
 *
 * API_TABAN_URL boş string ise: göreli/same-origin istek anlamına gelir
 * (web derlemesi). Dolu ise: mutlak URL öneki olarak kullanılır (Capacitor
 * derlemesi).
 */

export const API_TABAN_URL: string = process.env.NEXT_PUBLIC_API_BASE_URL || '';

/**
 * Verilen göreli API yolunu, hedefe (web/Capacitor) göre doğru taban URL ile
 * birleştirerek tam istek URL'sini üretir. Uygulama genelinde fetch
 * çağrılarında tutarlılık için bu yardımcı fonksiyon kullanılmalıdır.
 */
export function apiYolu(yol: string): string {
  const normalizeYol = yol.startsWith('/') ? yol : `/${yol}`;
  return `${API_TABAN_URL}${normalizeYol}`;
}