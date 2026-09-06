/**
 * Next.js yapılandırması — çift hedefli derleme (dual-target build):
 *
 *  - Vercel (varsayılan): standart Next.js sunucu derlemesi; /api/* altındaki
 *    sunucu taraflı rotalar (ör. Whisper tabanlı transkripsiyon yedeği)
 *    canlı kalır.
 *  - Capacitor (BUILD_TARGET=capacitor): statik dışa aktarım (`output: "export"`)
 *    yapılır; böylece uygulama, Android WebView içine Capacitor ile
 *    gömülebilecek statik HTML/JS/CSS paketine dönüşür. Statik dışa aktarım
 *    sunucu API rotalarını çalıştıramaz — bu yüzden AI çağrıları (Whisper,
 *    pitch/jitter/shimmer analizi vb.) öncelikle istemci tarafında
 *    (tarayıcıda) çalışacak şekilde tasarlanmalı; sunucu taraflı /api rotaları
 *    yalnızca Vercel derlemesinde var olan isteğe bağlı bir yedek katman
 *    olarak ele alınmalıdır.
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