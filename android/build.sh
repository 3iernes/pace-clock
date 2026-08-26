#!/usr/bin/env bash
# Compila el APK sin Gradle: aapt2 + javac + d8 + apksigner.
#
# La clave de todo esto es `--min-api 26` en d8: define la version del formato
# DEX que se emite. Con 26 sale DEX 038, que es hasta donde lee Android 8.0. El
# WebAPK de Google viene en 039 y por eso crashea sin llegar a arrancar.
set -euo pipefail

SDK="${ANDROID_HOME:-$HOME/AppData/Local/Android/Sdk}"
BT="$SDK/build-tools/36.1.0"
JAR="$SDK/platforms/android-36/android.jar"
OUT="build"
MIN_API=26

rm -rf "$OUT"
mkdir -p "$OUT/clases" "$OUT/dex" "$OUT/gen"

echo "1/6  recursos"
"$BT/aapt2.exe" compile --dir res -o "$OUT/res.zip"

echo "2/6  enlazado"
"$BT/aapt2.exe" link \
  -o "$OUT/base.apk" \
  -I "$JAR" \
  --manifest AndroidManifest.xml \
  -R "$OUT/res.zip" \
  --java "$OUT/gen" \
  --auto-add-overlay \
  --min-sdk-version "$MIN_API" \
  --target-sdk-version 28

echo "3/6  javac"
javac -nowarn -source 8 -target 8 -bootclasspath "$JAR" \
  -d "$OUT/clases" \
  java/ar/pileta/MainActivity.java "$OUT"/gen/ar/pileta/R.java 2>&1 | grep -v 'source value 8\|target value 8\|deprecat' || true

echo "4/6  dex (min-api $MIN_API)"
"$BT/d8.bat" --min-api "$MIN_API" --lib "$JAR" --output "$OUT/dex" \
  "$OUT"/clases/ar/pileta/*.class

echo "5/6  empaquetado"
python -c "
import zipfile, shutil
shutil.copy('$OUT/base.apk', '$OUT/sin-firmar.apk')
with zipfile.ZipFile('$OUT/sin-firmar.apk', 'a', zipfile.ZIP_DEFLATED) as z:
    z.write('$OUT/dex/classes.dex', 'classes.dex')
"

echo "6/6  firma"
if [ ! -f llave.jks ]; then
  keytool -genkeypair -keystore llave.jks -storepass pileta -keypass pileta \
    -alias pileta -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Pileta, OU=Personal, O=Personal, C=AR" 2>/dev/null
  echo "     (llave nueva generada)"
fi
"$BT/zipalign.exe" -f -p 4 "$OUT/sin-firmar.apk" "$OUT/alineado.apk"
"$BT/apksigner.bat" sign --ks llave.jks --ks-pass pass:pileta --key-pass pass:pileta \
  --min-sdk-version "$MIN_API" --out "$OUT/pileta.apk" "$OUT/alineado.apk"

echo ""
echo "listo -> android/$OUT/pileta.apk"
