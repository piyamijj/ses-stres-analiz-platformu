# Tasarım Sistemi — Ses Stres Analiz Platformu

Bu belge, ürünün görsel yönü için üretilen tasarım sözleşmesini kaydeder.
Amaç: ileride bu arayüze dokunacak her katkıcının (insan veya AI) aynı tat
yönünü sürdürmesini sağlamaktır. Beş alan aşağıda sırayla yer alır.

## 1. Tat Yönü ve Gerekçe

**Seçilen tat: Bespoke (özel türetim).**

Bu ürün bir enstrüman panosu / araç ürünüdür — kullanıcı bir görevi
tamamlar (ses kaydı alır, waveform'u okur, stres seviyesini izler), bu da
onu "Operate" moduna yerleştirir: ifade bütçesi düşüktür, taranabilirlik
(scanability) her şeyin önündedir. art-direction skill'inde hazır gelen
beş tat da (Editorial-Paper, Reader-Web, Web-Craft, Anthropic-Brand,
Investor-Sober) pazarlama sayfaları, uzun metin okuma yüzeyleri, yatırımcı
belgeleri veya kurumsal marka materyalleri için tasarlanmıştır; hiçbiri bu
ürünün sinyalleriyle güçlü bir eşleşme göstermez. Bu yüzden özel türetim
yoluna gidildi.

**Reddedilen klişe:** "AI ses uygulaması" kategorisinin varsayılan
görünümü — neon-cyan parıltılı, koyu zeminli, mor-mavi gradyanlı "yapay
zeka kahramanı" estetiği. Bunun tam tersi olan steril, beyaz, klinik
yazılım görünümü de aynı derecede klişedir ve aynı şekilde reddedildi —
bir klişenin tersi, ikinci bir klişedir.

**Görsel çıpa:** Profesyonel ses mikser konsollarının VU-metre köprüsü ve
osiloskop enstrüman ekranı estetiği (fiziksel enstrümantasyon geleneği),
DAW (dijital ses istasyonu) ve SRE telemetri panolarının ekran-yerli
(screen-native) düzen alışkanlıklarıyla harmanlanmıştır. Bu, en az iki
farklı malzeme ailesini bir araya getirir — fiziksel enstrüman donanımı ve
ekran-yerli telemetri geleneği — böylece türetim yalnızca nostaljik bir
fiziksel obje taklidine saplanıp kalmaz.

**Renk stratejisi:** Restrained (kısıtlı) — nötr koyu bir zemin üzerine
tek bir amber vurgu rengi. Bu strateji Operate modu için varsayılandır;
yüzeyin kendisi renk olmaz, renk yalnızca dikkat çekmesi gereken tek bir
noktada (vurgu) kullanılır.

## 2. Palet

```
--canvas: #0A0B0D   (zemin)
--panel:  #101216   (panel yüzeyi)
--ink:    #E4E6EA   (birincil metin)
--accent: #FF8A3D   (tek vurgu — VU-metre uyarı ampulü amberinden esinlenilmiştir)
--muted:  #6B7280   (ikincil metin / ayraçlar / alt yazılar)
```

`--accent` rengi bilinçli olarak amber seçilmiştir; cyan veya neon-mavi
tonlar, "AI ses uygulaması" kategorisinin klişe imzası olduğu için
**kasıtlı olarak reddedilmiştir**.

**Not:** Stres şiddeti göstergeleri (yeşilden ambere, ambardan kırmızıya
uzanan bir veri skalası) marka vurgu renginden **ayrı**, işlevsel bir veri
renk skalasıdır — ısı haritası mantığıyla çalışır ve marka kimliğiyle
karıştırılmamalıdır. Bu skala Modül 03 (kelime bazlı stres tespiti)
devreye girdiğinde waveform üzerinde uygulanacaktır.

## 3. Tipografi

```
Başlıklar / Arayüz metni: Archivo, ağırlık 500–700
                          (next/font/google, latin + latin-ext altkümeleri
                          — Türkçe karakterler [ş, ğ, ı, ö, ü, ç] için)
Veri / sayısal okumalar:  JetBrains Mono, ağırlık 400–700
                          (CSS değişkeni: --font-veri)
```

Inter, Roboto, Arial veya sistem varsayılanı (`system-ui`) gibi fontlar
başlıklarda **kullanılmamıştır** — bunlar LLM'in varsayılan seçimleri
olduğu için ayırt edicilikten uzaktır.

## 4. Ton ve Dil

- Kısa, kesin, enstrüman dili kullanılır: "Kayıt başlatıldı", "Sinyal
  zayıf" — sohbet tonu veya samimi ifadeler kullanılmaz.
- Sayılar her zaman somut birimlerle verilir: dBFS, Hz, % gibi —
  "yüksek" değil, "-18.2 dBFS" yazılır.
- Hata mesajları eylem odaklıdır: "Mikrofon erişimi reddedildi —
  tarayıcı ayarlarından izin verin" gibi, ne yapılması gerektiğini
  söyler.
- Ünlem işareti kullanılmaz.
- Emoji, arayüz süslemesi veya madde işareti olarak asla kullanılmaz.

## 5. Yasak Bölge

- Cyan-on-near-black zemin veya neon-cyan parıltı yok — klişe "AI ses
  uygulaması" görünümü.
- Mor-mavi gradyanlı hero veya zemin yok.
- Buton boyutundan büyük box-shadow/glow efekti veya neon text-shadow
  yok.
- 3D soyut waveform/orb render'ları veya "AI hero" gökkuşağı/iridescent
  şekiller yok.
- Yuvarlatılmış köşeli, yumuşak drop-shadow'lu SaaS kart stili yok —
  paneller düz, ince (hairline) kenarlıklı, bir enstrüman modülü gibi
  görünür.
- Ortalanmış hero-yığın (centered-stack) düzeni yok — asimetrik
  enstrüman/telemetri ızgarası kullanılır.
- Space Grotesk, Space Mono, IBM Plex ailesi veya Inter başlık fontu
  olarak kullanılmaz — yalnızca Archivo (başlık/arayüz) ve JetBrains
  Mono (veri) kullanılır.
- Dekoratif emoji, ikon veya madde işareti olarak kullanılmaz.

## Materyal Durumu

- **Logo:** Yok — gerekli değil, henüz istenmedi.
- **Ürün ekran görüntüsü:** Yok — henüz üretilmedi.
- **Marka renkleri:** Bu belgede türetildi — kullanıcıdan talep
  edilmedi.
- **Fontlar:** Bu belgede türetildi — next/font/google üzerinden
  Archivo + JetBrains Mono.