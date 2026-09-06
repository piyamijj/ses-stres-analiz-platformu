/**
 * Next.js yapılandırması — çift hedefli derleme (dual-target build):
 *
 *  - Vercel (varsayılan): standart Next.js sunucu derlemesi; /api/* altındaki
 *    sunucu taraflı rotalar (ör. Whisper tabanlı transkripsiyon yedeği)
 *    canlı kalır.
 *  - Capacitor (BUILD_TARGET=capacitor): statik dışa aktarım (`output: "export"`)
 *    yapılır; böylece uygulama, Android WebView içine Capacitor ile
 *    gömülebilecek statik HTML/JS/CSS paketine dönüşür. Statik dışa aktarım
 *    sunucu API rotalarını (src/app/api/**) İÇEREMEZ — bu yüzden
 *    `npm run build:capacitor`, ham `next build` yerine
 *    scripts/build-capacitor.sh betiğini çalıştırır: bu betik src/app/api
 *    dizinini derleme süresince geçici olarak kaldırıp sonra geri yükler.
 *    Paketlenmiş Android uygulaması, Modül 03 transkripsiyonu için bu API'yi
 *    yerelde değil, ağ üzerinden Vercel'de barındırılan paylaşılan backend'e
 *    istek atarak kullanır (bkz. src/lib/config.ts, NEXT_PUBLIC_API_BASE_URL).
 *
 * Bu desen, kullanıcının piyamijj/Translater deposunda halihazırda çalışan
 * yapılandırmadan uyarlanmıştır.
 */
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isCapacitorBuild
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;