# Ses Stres Analiz Platformu

Yüksek teknolojili, tamamen Türkçe arayüzlü ses stres/duygu analiz platformu. Next.js tabanlı; Vercel üzerinde web uygulaması olarak, Capacitor ile de Android APK olarak dağıtılır.

## piyamijj/Translater ile ilişkisi

Bu proje, kullanıcının mevcut **piyamijj/Translater** deposundan (PolyGlot Live AI, gerçek zamanlı sesli çeviri uygulaması) mimari olarak faydalanır.

Translater deposu incelendi: aynı Next.js 14 + TypeScript + Tailwind + Capacitor/Android teknoloji yığınını kullanıyor. Android APK GitHub Actions iş akışı (`.github/workflows/build-apk.yml`) daha önce art arda 3 kez başarısız olmuş, ancak aynı gün içinde giderilmiş ve o tarihten bu yana (v1.0.0–v1.0.3 etiketleri dahil) kesintisiz başarıyla derleniyor durumda.

Bu platform, Translater'ın **kanıtlanmış çalışan CI/CD hattını** (`next.config.mjs` çift-hedefli derleme, `capacitor.config.json`, `vercel.json`, `build-apk.yml`) doğrudan temel alarak/uyarlayarak devralır — böylece Translater'da bir kez çözülen build sorunlarının burada tekrarlanma riski en aza indirilmiştir.

Ürün mantığı (ses çeviri vs. ses stres analizi) tamamen farklı olduğundan kod tabanı Translater'dan bağımsız, ayrı bir proje/depo olarak kurgulanmıştır — yalnızca dağıtım/derleme iskeleti ortak alınmıştır.

**Not:** Bu proje henüz ayrı bir GitHub deposuna itilmedi; depo stratejisi (yeni depo mu, mevcut hesapta ayrı bir proje mi) kullanıcıyla teyit edilecek.

## Modüller (durum)

| Modül | Açıklama | Durum |
|---|---|---|
| Modül 01 | Hassas Ses Yakalama | **TAMAMLANDI** — bkz. `src/hooks/useSesYakalama.ts` |
| Modül 02 | Waveform Normalizasyonu ve Görselleştirme | **TAMAMLANDI** — bkz. `src/lib/audio/normalizasyon.ts`, `src/components/audio/SesStresPaneli.tsx` |
| Modül 03 | Kelime Bazlı Stres Tespiti / AI | **PLANLANDI** — veri şeması hazır: `src/lib/types.ts`; OpenAI Whisper API entegrasyonu bekliyor, API anahtarı gerekiyor |

## Teknoloji yığını

Next.js 14 (App Router, TypeScript) · Tailwind CSS · Web Audio API (`AudioContext`, `BiquadFilterNode`, `AnalyserNode`, `MediaRecorder`) · Capacitor (Android) · wavesurfer.js (ileride kayıt sonrası waveform + stres bölgesi vurgulama için) · Zustand · GitHub Actions (Android APK CI/CD) · Vercel (web dağıtımı).

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

- `OPENAI_API_KEY` — Modül 03 için (henüz bağlı değil)
- `VERCEL_TOKEN` — CI/CD dağıtımı için

Bu anahtarları main sohbete **değil**, bu proje oturumuna doğrudan iletin.

## Sonraki adımlar

- Modül 03: Whisper entegrasyonu, pitch/jitter/shimmer analizi, waveform üzerinde renkli stres vurgusu ve transkript tooltip'i.
- `vercel.json` üzerinden gerçek Vercel projesine bağlama.
- GitHub deposu stratejisinin netleştirilmesi (yeni depo mu, mevcut hesapta ayrı bir proje mi).