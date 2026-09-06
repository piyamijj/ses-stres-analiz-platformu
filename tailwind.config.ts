/**
 * Tasarım sistemi — bu proje için üretilen tasarım sözleşmesinden alınmıştır.
 * Mod: "Operate" (enstrüman panosu / araç); ifade bütçesi düşük, tarama
 * kolaylığı önceliklidir. Renk stratejisi: "Restrained" — nötr koyu zemin +
 * tek bir amber vurgu rengi. Kasıtlı olarak cyan/neon-mavi veya mor-mavi
 * gradyan YOK (klişe "AI ses uygulaması" estetiğinden kaçınmak için).
 */
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0A0B0D',
        panel: '#101216',
        ink: '#E4E6EA',
        accent: '#FF8A3D',
        muted: '#6B7280',
      },
      fontFamily: {
        arayuz: ['var(--font-arayuz)', 'system-ui', 'sans-serif'],
        veri: ['var(--font-veri)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;