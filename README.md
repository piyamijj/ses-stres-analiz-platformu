# Ses Stres Analiz Platformu

Yüksek teknolojili, tamamen Türkçe arayüzlü ses stres/duygu analiz platformu. Next.js tabanlı; Vercel üzerinde web uygulaması olarak, Capacitor ile de Android APK olarak dağıtılır.

## piyamijj/Translater ile ilişkisi

Bu proje, kullanıcının mevcut **piyamijj/Translater** deposundan (PolyGlot Live AI, gerçek zamanlı sesli çeviri uygulaması) mimari olarak faydalanır.

Translater deposu incelendi: aynı Next.js 14 + TypeScript + Tailwind + Capacitor/Android teknoloji yığınını kullanıyor. Android APK GitHub Actions iş akışı (`.github/workflows/build-apk.yml`) daha önce art arda 3 kez başarısız olmuş, ancak aynı gün içinde giderilmiş ve o tarihten bu yana (v1.0.0–v1.0.3 etiketleri dahil) kesintisiz başarıyla derleniyor durumda.

Bu platform, Translater'ın **kanıtlanmış çalışan CI/CD hattını** (`next.config.mjs` çift-hedefli derleme, `capacitor.config.json`, `vercel.json`, `build-apk.yml`) doğrudan temel alarak/uyarlayarak devralır — böylece Translater'da bir kez çözülen build sorunlarının burada tekrarlanma riski en aza indirilmiştir.

Ürün mantığı (ses çeviri vs. ses stres analizi) tamamen farklı olduğundan kod tabanı Translater'dan bağımsız, ayrı bir proje/depo olarak kurgulanmıştır — yalnızca dağıtım/derleme iskeleti ortak alınmıştır.

**Güncelleme:** Proje artık bağımsız depoda: **github.com/piyamijj/ses-stres-analiz-platformu**. Canlı web dağıtımı: **https://ses-stres-analiz-platformu.vercel.app**.

## Modüller (durum)

| Modül | Açıklama | Durum |
|---|---|---|
| Modül 01 | Hassas Ses Yakalama | **TAMAMLANDI** — bkz. `src/hooks/useSesYakalama.ts` |
| Modül 02 | Waveform Normalizasyonu ve Görselleştirme | **TAMAMLANDI** — bkz. `src/lib/audio/normalizasyon.ts`, `src/components/audio/SesStresPaneli.tsx` |
| Modül 03 | Kelime Bazlı Stres Tespiti / AI | **TAMAMLANDI (v1)** — Groq Whisper (`whisper-large-v3-turbo`) ile kelime bazlı zaman damgalı transkripsiyon (`src/app/api/transkript/route.ts`), 5 anahtarlık rotasyon/fallback havuzu (`src/lib/ai/anahtarRotasyonu.ts`), istemci tarafında pitch/jitter/shimmer tabanlı akustik stres skoru (`src/lib/audio/akustikOzellikler.ts`) ve waveform üzerinde renkli vurgu + kelime tooltip'i. Gemini anahtar havuzu da hazır ancak henüz aktif çağrı yapmıyor (gelecekteki dil/duygu yorumlama katmanı için ayrılmış). |

## Teknoloji yığını

Next.js 14 (App Router, TypeScript) · Tailwind CSS · Web Audio API (`AudioContext`, `BiquadFilterNode`, `AnalyserNode`, `MediaRecorder`) · Capacitor (Android) · Groq (Whisper-uyumlu transkripsiyon, anahtar rotasyonuyla) · Gemini (hazır, henüz bağlı değil) · wavesurfer.js (ileride ek görselleştirme için) · Zustand · GitHub Actions (Android APK CI/CD) · Vercel (web dağıtımı + `/api/transkript` backend'i).

## Proje yapısı

```
├── package.json
├── next.config.mjs                    çift hedefli derleme (Vercel sunucu vs. Capacitor statik dışa aktarım)
├── vercel.json
├── capacitor.config.json
├── tailwind.config.ts
├── .github/workflows/build-apk.yml    CI: Android APK'yı derler ve (etiketlerde) GitHub Releases'a yayınlar
├── docs/tasarim-sistemi.md            tasarım sözleşmesi (palet, tipografi, ton, yasak bölge)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── audio/
│   │       └── SesStresPaneli.tsx     ana ses yakalama + waveform bileşeni
│   ├── hooks/
│   │   └── useSesYakalama.ts          mikrofon yakalama + filtre zinciri + canlı metrikler
│   └── lib/
│       ├── audio/
│       │   ├── filtreZinciri.ts       high-pass/low-pass/notch gürültü filtresi
│       │   └── normalizasyon.ts       RMS/Peak normalizasyon matematiği
│       └── types.ts                   paylaşılan veri tipleri (Modül 03 dahil)
└── .env.example
```

## Yerel geliştirme

```
npm install
npm run dev
```

Ardından `http://localhost:3000` adresini açın. Tarayıcıdan mikrofon izni vermeniz gerekir — Web Audio API mikrofon erişimi güvenlik gereği yalnızca HTTPS veya `localhost` üzerinden çalışır.

## Android APK derleme

GitHub Actions, `main` dalına her push'ta veya bir `v*` etiketi atıldığında APK'yı otomatik derler.

Yerel olarak derlemek isterseniz:

```
npm run cap:add:android   # ilk kurulum
npm run cap:sync
cd android && ./gradlew assembleDebug
```

## Ortam değişkenleri (API anahtarları)

`.env.example` dosyasını `.env.local` olarak kopyalayın:

- `GROQ_API_KEY_1`..`GROQ_API_KEY_5` — Modül 03 transkripsiyonu için (rotasyonlu, en az 1 tanesi yeterli)
- `GEMINI_API_KEY_1`..`GEMINI_API_KEY_5` — gelecekteki dil/duygu yorumlama katmanı için (hazır, henüz aktif çağrı yok)
- `NEXT_PUBLIC_API_BASE_URL` — yalnızca Capacitor/Android derlemesinde ayarlanır (bkz. `src/lib/config.ts`)
- `VERCEL_TOKEN` — CI/CD dağıtımı için

Bu anahtarları main sohbete **değil**, bu proje oturumuna doğrudan iletin. Üretim ortamında (Vercel) bu anahtarlar proje ortam değişkeni olarak şifreli şekilde saklanır.

## Modül 03 mimarisi (özet)

`/api/transkript` Route Handler'ı hem web (Vercel, aynı origin) hem de Capacitor ile paketlenmiş Android uygulaması (farklı origin, ağ üzerinden aynı Vercel backend'ine istek atar) tarafından ortak kullanılır. Next.js statik export (Capacitor hedefi) sunucu API rotalarını barındıramadığından, `npm run build:capacitor` ham `next build` yerine `scripts/build-capacitor.sh` betiğini çalıştırır — bu betik `src/app/api` dizinini derleme süresince geçici olarak çıkarıp sonra geri yükler. Stres skoru HESAPLAMASI sunucuda değil, istemcide yapılır: sunucu yalnızca kelime bazlı zaman damgalarını döndürür, istemci bunları yerel olarak decode edilmiş ses tamponuyla birleştirerek pitch/jitter/shimmer analizini kendisi yürütür — böylece ses dosyası tekrar tekrar yüklenmez ve sunucusuz fonksiyon hafif kalır.

**Önemli not:** `kelimeStresSkoruHesapla` fonksiyonu (bkz. `src/lib/audio/akustikOzellikler.ts`) şeffaf bir SEZGİSEL (heuristic) modeldir — klinik olarak doğrulanmış bir teşhis aracı değildir. Gerçek kullanımdan önce etiketli verilerle kalibre edilmesi önerilir.

## Sonraki adımlar

- Gemini anahtar havuzunu Modül 03'e (dil/duygu yorumlama, transkript üzerinden bağlamsal analiz) bağlamak.
- `kelimeStresSkoruHesapla` sezgisel modelinin etiketli verilerle kalibrasyonu/doğrulanması.
- Android APK'da mikrofon izinleri ve arka planda kesintisiz kayıt davranışının cihaz üzerinde test edilmesi.