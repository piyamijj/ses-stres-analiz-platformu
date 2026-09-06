import type { Metadata } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arayuz',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '700'],
  variable: '--font-veri',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ses Stres Analiz Platformu',
  description: 'Gerçek zamanlı ses yakalama, waveform normalizasyonu ve kelime bazlı stres/duygu tespiti.',
};

export default function KokLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${archivo.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-canvas text-ink font-arayuz antialiased">
        {children}
      </body>
    </html>
  );
}