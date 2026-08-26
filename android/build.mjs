#!/usr/bin/env node
/**
 * Compila el APK de la envoltura y lo deja listo para publicar.
 *
 *     npm run apk
 *
 * Sin Gradle: aapt2 para los recursos, javac para el codigo, d8 para el dex y
 * apksigner para la firma. Todo sale del SDK de Android que ya esta instalado.
 *
 * Lo unico que no se puede tocar sin romperlo es MIN_API. Define la version del
 * formato DEX que emite d8, y con 26 sale DEX 038, que es hasta donde lee
 * Android 8.0. Subirlo a 28 o mas emite DEX 039 y el telefono deja de poder
 * arrancar la app: es exactamente lo que le pasa al paquete que genera Google.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
const SALIDA = join(AQUI, 'build');

const MIN_API = 26;
const TARGET_API = 28;
const CLAVE = 'pileta';

function ubicarSdk() {
  const candidatos = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    process.env.HOME && join(process.env.HOME, 'Android', 'Sdk'),
    process.env.HOME && join(process.env.HOME, 'Library', 'Android', 'sdk'),
  ].filter(Boolean);
  const sdk = candidatos.find((c) => existsSync(join(c, 'build-tools')));
  if (!sdk) {
    throw new Error(
      'No encuentro el SDK de Android. Defini ANDROID_HOME apuntando a el.',
    );
  }
  return sdk;
}

/** La build-tools mas nueva y la plataforma mas nueva que haya instaladas. */
function elegirVersiones(sdk) {
  const ordenar = (a, b) => b.localeCompare(a, undefined, { numeric: true });
  const bt = readdirSync(join(sdk, 'build-tools')).sort(ordenar)[0];
  const plataforma = readdirSync(join(sdk, 'platforms'))
    .filter((p) => existsSync(join(sdk, 'platforms', p, 'android.jar')))
    .sort(ordenar)[0];
  if (!bt || !plataforma) throw new Error('Falta build-tools o una plataforma en el SDK.');
  return { bt, plataforma };
}

function correr(paso, cmd, args) {
  process.stdout.write(`${paso}\n`);
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    process.stderr.write((r.stdout || '') + (r.stderr || ''));
    throw new Error(`Fallo: ${cmd}`);
  }
  return r.stdout ?? '';
}

const sdk = ubicarSdk();
const { bt, plataforma } = elegirVersiones(sdk);
const BT = join(sdk, 'build-tools', bt);
const ANDROID_JAR = join(sdk, 'platforms', plataforma, 'android.jar');
const exe = (n) => join(BT, process.platform === 'win32' ? `${n}.exe` : n);

console.log(`SDK        ${sdk}`);
console.log(`build-tools ${bt}   plataforma ${plataforma}   min-api ${MIN_API}\n`);

rmSync(SALIDA, { recursive: true, force: true });
mkdirSync(join(SALIDA, 'clases'), { recursive: true });
mkdirSync(join(SALIDA, 'dex'), { recursive: true });

correr('1/6  recursos', exe('aapt2'), [
  'compile', '--dir', join(AQUI, 'res'), '-o', join(SALIDA, 'res.zip'),
]);

correr('2/6  enlazado', exe('aapt2'), [
  'link',
  '-o', join(SALIDA, 'base.apk'),
  '-I', ANDROID_JAR,
  '--manifest', join(AQUI, 'AndroidManifest.xml'),
  '-R', join(SALIDA, 'res.zip'),
  '--java', join(SALIDA, 'gen'),
  '--auto-add-overlay',
  '--min-sdk-version', String(MIN_API),
  '--target-sdk-version', String(TARGET_API),
]);

correr('3/6  javac', 'javac', [
  '-nowarn', '-source', '8', '-target', '8', '-bootclasspath', ANDROID_JAR,
  '-d', join(SALIDA, 'clases'),
  join(AQUI, 'java', 'ar', 'pileta', 'MainActivity.java'),
  join(SALIDA, 'gen', 'ar', 'pileta', 'R.java'),
]);

const clases = readdirSync(join(SALIDA, 'clases', 'ar', 'pileta'))
  .filter((f) => f.endsWith('.class'))
  .map((f) => join(SALIDA, 'clases', 'ar', 'pileta', f));

correr(`4/6  dex (min-api ${MIN_API})`, 'java', [
  '-cp', join(BT, 'lib', 'd8.jar'), 'com.android.tools.r8.D8',
  '--min-api', String(MIN_API), '--lib', ANDROID_JAR,
  '--output', join(SALIDA, 'dex'), ...clases,
]);

process.stdout.write('5/6  empaquetado\n');
const { default: AdmZipNo } = { default: null }; // sin dependencias: se usa jar del JDK
correr('', 'jar', [
  'uf', join(SALIDA, 'base.apk'), '-C', join(SALIDA, 'dex'), 'classes.dex',
]);
copyFileSync(join(SALIDA, 'base.apk'), join(SALIDA, 'sin-firmar.apk'));

const llave = join(AQUI, 'llave.jks');
if (!existsSync(llave)) {
  correr('     (generando llave de firma)', 'keytool', [
    '-genkeypair', '-keystore', llave, '-storepass', CLAVE, '-keypass', CLAVE,
    '-alias', CLAVE, '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
    '-dname', 'CN=Pileta, OU=Personal, O=Personal, C=AR',
  ]);
}

correr('6/6  firma', exe('zipalign'), [
  '-f', '-p', '4', join(SALIDA, 'sin-firmar.apk'), join(SALIDA, 'alineado.apk'),
]);
correr('', 'java', [
  '-jar', join(BT, 'lib', 'apksigner.jar'), 'sign',
  '--ks', llave, '--ks-pass', `pass:${CLAVE}`, '--key-pass', `pass:${CLAVE}`,
  '--min-sdk-version', String(MIN_API),
  '--out', join(SALIDA, 'pileta.apk'), join(SALIDA, 'alineado.apk'),
]);

// Verificar que el DEX haya salido en una version que el telefono pueda leer.
const dex = readFileSync(join(SALIDA, 'dex', 'classes.dex')).subarray(4, 7).toString();
if (dex > '038') {
  throw new Error(
    `El DEX salio en ${dex} y Android 8.0 lee hasta 038. Revisa MIN_API.`,
  );
}

const destino = join(RAIZ, 'public', 'pileta.apk');
copyFileSync(join(SALIDA, 'pileta.apk'), destino);

console.log(`\nDEX ${dex}  (Android 8.0 lee hasta 038)`);
console.log('APK -> public/pileta.apk');
console.log('Deployalo con: git add public/pileta.apk && git commit && git push');
