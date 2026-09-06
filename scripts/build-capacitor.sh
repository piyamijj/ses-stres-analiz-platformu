#!/usr/bin/env bash
# Capacitor statik export derlemesi icin API route'larini gecici olarak devreden
# cikaran ve derleme sonrasi geri yukleyen yardimci betik.

set -euo pipefail

API_DIR="src/app/api"
BACKUP_DIR="/tmp/ses-stres-api-backup-$$"

# Herhangi bir hata veya cikis durumunda API dizinini mutlaka geri yukle (trap)
geri_yukle() {
  if [ -d "$BACKUP_DIR" ]; then
    echo "==> [TEMIZLIK] API route'lari geri yukleniyor..."
    mv "$BACKUP_DIR" "$API_DIR"
    echo "==> [TEMIZLIK] API route'lari geri yuklendi."
  fi
}
trap geri_yukle EXIT

if [ -d "$API_DIR" ]; then
  echo "==> [BUILD] Capacitor statik export icin API route'lari gecici olarak cikariliyor..."
  mv "$API_DIR" "$BACKUP_DIR"
else
  echo "==> [BUILD] API route dizini bulunamadi, isleme devam ediliyor..."
fi

echo "==> [BUILD] Next.js statik export baslatiliyor..."
# BUILD_TARGET=capacitor ortam degiskeni next.config.mjs tarafindan okunur
export BUILD_TARGET=capacitor
npx next build

echo "==> [BUILD] Next.js statik export basariyla tamamlandi."
# trap EXIT tetiklendiginde geri_yukle fonksiyonu calisacak ve dizini yerine koyacaktir.